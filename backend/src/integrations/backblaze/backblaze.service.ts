import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BACKBLAZE_MODULE_OPTIONS } from './backblaze.constants';
import type { BackblazeModuleOptions } from './backblaze.interfaces';

export interface UploadObjectParams {
  key: string;
  body: Buffer | Uint8Array | Blob | string;
  contentType: string;
  metadata?: Record<string, string>;
}

@Injectable()
export class BackblazeService {
  private readonly options: BackblazeModuleOptions;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(@Inject(BACKBLAZE_MODULE_OPTIONS) options: BackblazeModuleOptions) {
    this.options = options;
    this.bucket = options.bucket;
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region ?? 'auto',
      credentials: {
        accessKeyId: options.keyId,
        secretAccessKey: options.applicationKey,
      },
      forcePathStyle: options.forcePathStyle ?? true,
    });
  }

  async uploadObject(params: UploadObjectParams): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      Metadata: params.metadata,
    });

    try {
      await this.client.send(command);
    } catch (error) {
      throw new InternalServerErrorException('Failed to upload object to Backblaze');
    }
  }

  async getSignedUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });

    try {
      return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate signed URL');
    }
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({ Bucket: this.bucket, Key: key });

    try {
      await this.client.send(command);
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete object from Backblaze');
    }
  }
}
