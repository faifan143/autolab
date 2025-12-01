import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type SessionDocument = Session & Document;

@Schema({
  timestamps: true,
})
export class Session {
  @Prop({ type: Types.ObjectId, ref: 'Lab', required: true })
  labId: Types.ObjectId;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop({ required: true, unique: true })
  qrStartToken: string;

  @Prop({ required: true, unique: true })
  qrEndToken: string;

  @Prop({ required: false })
  qrStartExpiresAt?: Date;

  @Prop({ required: false })
  qrEndExpiresAt?: Date;

  @Prop({ type: Boolean, default: false })
  isStreaming: boolean;

  @Prop({ type: String, trim: true })
  streamUrl?: string;

  @Prop({ type: String, trim: true })
  streamKey?: string;

  @Prop({ type: Date })
  streamStartedAt?: Date;

  @Prop({ type: Date })
  streamEndedAt?: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index({ labId: 1, startTime: 1 });
