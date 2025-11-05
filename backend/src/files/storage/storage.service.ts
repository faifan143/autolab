import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface UploadParams {
  key: string;
  body: Buffer;
  contentType: string;
}

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('B2_BUCKET');

    this.client = new S3Client({
      endpoint: this.configService.getOrThrow<string>('B2_ENDPOINT'),
      region: this.configService.get<string>('B2_REGION') ?? 'auto',
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('B2_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>('B2_APPLICATION_KEY'),
      },
      forcePathStyle: true,
    });
  }

  async upload({ key, body, contentType }: UploadParams): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    try {
      await this.client.send(command);
    } catch (error) {
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  async getSignedUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate file URL');
    }
  }
}
