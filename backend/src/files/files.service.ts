import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Express } from 'express';
import { Model, Types } from 'mongoose';
import { LabDocument } from '../labs/schemas/lab.schema';
import { LabsService } from '../labs/labs.service';
import { SessionDocument } from '../sessions/schemas/session.schema';
import { SessionsService } from '../sessions/sessions.service';
import { UserRole } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { StoredFile, FileDocument } from './schemas/file.schema';
import { BackblazeService } from '../integrations/backblaze/backblaze.service';

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(StoredFile.name)
    private readonly fileModel: Model<FileDocument>,
    private readonly backblazeService: BackblazeService,
    private readonly labsService: LabsService,
    private readonly sessionsService: SessionsService,
    private readonly usersService: UsersService,
  ) {}

  async upload(
    dto: UploadFileDto,
    file: Express.Multer.File,
    requesterId: string,
    role: UserRole,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const owner = await this.usersService.findById(requesterId);
    if (!owner) {
      throw new NotFoundException('User not found');
    }

    let lab: LabDocument | null = null;
    if (dto.labId) {
      lab = await this.labsService.findById(dto.labId);
      if (!lab) {
        throw new NotFoundException('Lab not found');
      }
      this.ensureLabAccess(lab, requesterId, role);
    }

    let session: SessionDocument | null = null;
    if (dto.sessionId) {
      session = await this.sessionsService.findById(dto.sessionId);
      if (!session) {
        throw new NotFoundException('Session not found');
      }
      if (lab && session.labId.toString() !== lab.id) {
        throw new BadRequestException('Session does not belong to the provided lab');
      }
      if (!lab) {
        lab = await this.labsService.findById(session.labId.toString());
        if (!lab) {
          throw new NotFoundException('Lab not found for session');
        }
      }
      this.ensureLabAccess(lab, requesterId, role);
    }

    if (!lab && role === UserRole.Student) {
      throw new ForbiddenException('Students must target a lab when uploading files');
    }

    const labId = lab?.id;
    const sessionId = session?.id;

    const storageKey = this.buildStorageKey({
      originalName: file.originalname,
      requesterId,
      labId,
      sessionId,
    });

    await this.backblazeService.uploadObject({
      key: storageKey,
      body: file.buffer,
      contentType: file.mimetype,
    });

    const version = await this.computeVersion(file.originalname, labId, sessionId);

    const storedFile = await this.fileModel.create({
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      ownerId: new Types.ObjectId(requesterId),
      labId: lab ? new Types.ObjectId(lab.id) : undefined,
      sessionId: session ? new Types.ObjectId(session.id) : undefined,
      storageKey,
      version,
    });

    const downloadUrl = await this.backblazeService.getSignedUrl(storageKey);

    return {
      id: storedFile.id,
      fileName: storedFile.fileName,
      size: storedFile.size,
      mimeType: storedFile.mimeType,
      labId,
      sessionId,
      version: storedFile.version,
      downloadUrl,
    };
  }

  async getDownloadUrl(fileId: string, requesterId: string, role: UserRole) {
    const file = await this.fileModel.findById(fileId);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.labId) {
      const lab = await this.labsService.findById(file.labId.toString());
      if (!lab) {
        throw new NotFoundException('Lab not found for file');
      }
      this.ensureLabAccess(lab, requesterId, role);
    } else if (role !== UserRole.Admin && file.ownerId.toString() !== requesterId) {
      throw new ForbiddenException('Unauthorized to access this file');
    }

    const url = await this.backblazeService.getSignedUrl(file.storageKey);
    return { url };
  }

  private async computeVersion(
    fileName: string,
    labId?: string,
    sessionId?: string,
  ): Promise<number> {
    const criteria: Record<string, unknown> = { fileName };
    if (labId) {
      criteria.labId = new Types.ObjectId(labId);
    }
    if (sessionId) {
      criteria.sessionId = new Types.ObjectId(sessionId);
    }

    const latest = await this.fileModel
      .find(criteria)
      .sort({ version: -1 })
      .limit(1)
      .exec();

    return latest.length ? latest[0].version + 1 : 1;
  }

  private ensureLabAccess(lab: LabDocument, requesterId: string, role: UserRole) {
    if (role === UserRole.Admin) {
      return;
    }

    if (role === UserRole.Teacher) {
      if (lab.teacherId.toString() !== requesterId) {
        throw new ForbiddenException('Teachers can only manage their labs');
      }
      return;
    }

    if (role === UserRole.Student) {
      const studentIds = (lab.students ?? []) as Types.ObjectId[];
      const isMember = studentIds.some((id) => id.toString() === requesterId);
      if (!isMember) {
        throw new ForbiddenException('Students must belong to the lab');
      }
      return;
    }

    throw new ForbiddenException('Unauthorized');
  }

  private buildStorageKey(params: {
    originalName: string;
    requesterId: string;
    labId?: string;
    sessionId?: string;
  }): string {
    const sanitizedName = params.originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const segments = [
      'files',
      params.labId ?? 'general',
      params.sessionId ?? 'root',
      `${Date.now()}-${new Types.ObjectId().toHexString()}`,
      sanitizedName,
    ];

    return segments.join('/');
  }
}
