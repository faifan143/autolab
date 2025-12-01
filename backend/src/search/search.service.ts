import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lab, LabDocument } from '../labs/schemas/lab.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Session, SessionDocument } from '../sessions/schemas/session.schema';
import {
  StoredFile,
  FileDocument,
} from '../files/schemas/file.schema';
import { GlobalSearchResultDto } from './dto/global-search-result.dto';
import { GlobalSearchType } from './dto/global-search-query.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Lab.name) private readonly labModel: Model<LabDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    @InjectModel(StoredFile.name)
    private readonly fileModel: Model<FileDocument>,
  ) {}

  async search(
    query: string,
    limit: number,
    types?: GlobalSearchType[],
  ): Promise<GlobalSearchResultDto> {
    const trimmed = query.trim();
    if (!trimmed) {
      throw new BadRequestException('Query must not be empty');
    }

    const effectiveLimit = Math.min(Math.max(limit, 1), 50);
    const typeSet = new Set(
      (types && types.length ? types : Object.values(GlobalSearchType)) as string[],
    );

    const [
      labs,
      users,
      sessions,
      files,
    ] = await Promise.all([
      typeSet.has(GlobalSearchType.Labs)
        ? this.searchLabs(trimmed, effectiveLimit)
        : Promise.resolve([]),
      typeSet.has(GlobalSearchType.Users)
        ? this.searchUsers(trimmed, effectiveLimit)
        : Promise.resolve([]),
      typeSet.has(GlobalSearchType.Sessions)
        ? this.searchSessions(trimmed, effectiveLimit)
        : Promise.resolve([]),
      typeSet.has(GlobalSearchType.Files)
        ? this.searchFiles(trimmed, effectiveLimit)
        : Promise.resolve([]),
    ]);

    return { labs, users, sessions, files };
  }

  private async searchLabs(
    query: string,
    limit: number,
  ): Promise<GlobalSearchResultDto['labs']> {
    const regex = new RegExp(this.escapeRegex(query), 'i');

    const labs = await this.labModel
      .find({ name: { $regex: regex } })
      .limit(limit)
      .populate<{ teacherId: UserDocument }>('teacherId', 'name')
      .exec();

    return labs.map((lab) => ({
      id:
        lab._id instanceof Types.ObjectId
          ? lab._id.toHexString()
          : String(lab._id),
      name: lab.name,
      teacherName: (lab.teacherId as UserDocument | undefined)?.name ?? null,
    }));
  }

  private async searchUsers(
    query: string,
    limit: number,
  ): Promise<GlobalSearchResultDto['users']> {
    const regex = new RegExp(this.escapeRegex(query), 'i');

    const users = await this.userModel
      .find({
        $or: [{ name: { $regex: regex } }, { email: { $regex: regex } }],
      })
      .limit(limit)
      .exec();

    return users.map((user) => ({
      id:
        user._id instanceof Types.ObjectId
          ? user._id.toHexString()
          : String(user._id),
      name: user.name ?? null,
      email: user.email ?? null,
      role: user.role ?? null,
    }));
  }

  private async searchSessions(
    query: string,
    limit: number,
  ): Promise<GlobalSearchResultDto['sessions']> {
    const regex = new RegExp(this.escapeRegex(query), 'i');

    // Search by session id (as string) OR lab name containing query.
    const sessions = await this.sessionModel
      .aggregate<
        SessionDocument & {
          lab: { _id: Types.ObjectId; name: string };
        }
      >([
        {
          $lookup: {
            from: this.labModel.collection.name,
            localField: 'labId',
            foreignField: '_id',
            as: 'lab',
          },
        },
        { $unwind: '$lab' },
        {
          $match: {
            $or: [
              { _id: { $regex: regex } }, // string cast in projection below
              { 'lab.name': { $regex: regex } },
            ],
          } as any,
        },
        {
          $limit: limit,
        },
      ])
      .exec();

    return sessions.map((session) => {
      const id =
        session._id instanceof Types.ObjectId
          ? session._id.toHexString()
          : String(session._id);
      const labId =
        session.labId instanceof Types.ObjectId
          ? session.labId.toHexString()
          : String(session.labId);

      return {
        id,
        labId,
        labName: session.lab?.name ?? null,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime ? session.endTime.toISOString() : null,
      };
    });
  }

  private async searchFiles(
    query: string,
    limit: number,
  ): Promise<GlobalSearchResultDto['files']> {
    const regex = new RegExp(this.escapeRegex(query), 'i');

    const files = await this.fileModel
      .find({
        fileName: { $regex: regex },
      })
      .limit(limit)
      .exec();

    return files.map((file) => ({
      id:
        file._id instanceof Types.ObjectId
          ? file._id.toHexString()
          : String(file._id),
      name: file.fileName,
      labId: file.labId ? file.labId.toString() : null,
      sessionId: file.sessionId ? file.sessionId.toString() : null,
      ownerId: file.ownerId ? file.ownerId.toString() : null,
    }));
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}


