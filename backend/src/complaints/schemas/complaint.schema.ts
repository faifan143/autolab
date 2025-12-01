import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ComplaintDocument = Complaint & Document;

export enum ComplaintStatus {
  New = 'new',
  InReview = 'in_review',
  Resolved = 'resolved',
  Dismissed = 'dismissed',
}

@Schema({
  timestamps: true,
})
export class Complaint {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reporterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  teacherId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Lab' })
  labId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  content: string;

  @Prop({ type: Boolean, default: false })
  isAnonymous: boolean;

  @Prop({
    type: String,
    enum: ComplaintStatus,
    default: ComplaintStatus.New,
  })
  status: ComplaintStatus;

  @Prop({ trim: true })
  adminNote?: string;

  @Prop({ type: Date })
  resolvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  resolvedBy?: Types.ObjectId;
}

export const ComplaintSchema = SchemaFactory.createForClass(Complaint);

ComplaintSchema.index({ labId: 1, teacherId: 1, status: 1 });
ComplaintSchema.index({ reporterId: 1, createdAt: -1 });






