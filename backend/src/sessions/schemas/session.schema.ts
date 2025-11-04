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
  recordedVideoUrl?: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index({ labId: 1, startTime: 1 });
