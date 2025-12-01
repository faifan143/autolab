import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type LabDocument = Lab & Document;

@Schema({
  timestamps: true,
})
export class Lab {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacherId: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  students: Types.ObjectId[];

  @Prop({ type: Boolean, default: false })
  isArchived: boolean;

  @Prop({ type: Date })
  archivedAt?: Date;

  @Prop({ type: Boolean, default: false })
  isSuspended: boolean;

  @Prop({ type: Date })
  suspendedAt?: Date;

  @Prop({ type: String, trim: true })
  suspendReason?: string;

  @Prop({ type: Boolean, default: false })
  archiveRequested: boolean;

  @Prop({ type: Date })
  archiveRequestedAt?: Date;

  @Prop({ type: String, trim: true })
  archiveRequestReason?: string;
}

export const LabSchema = SchemaFactory.createForClass(Lab);

LabSchema.index({ teacherId: 1 });
