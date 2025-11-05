import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FileDocument = StoredFile & Document;

@Schema({
  timestamps: true,
})
export class StoredFile {
  @Prop({ required: true, trim: true })
  fileName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Lab' })
  labId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Session' })
  sessionId?: Types.ObjectId;

  @Prop({ required: true, unique: true })
  storageKey: string;

  @Prop({ default: 1 })
  version: number;
}

export const FileSchema = SchemaFactory.createForClass(StoredFile);

FileSchema.index({ labId: 1 });
FileSchema.index({ sessionId: 1 });
