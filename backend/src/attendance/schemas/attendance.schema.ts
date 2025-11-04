import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

export enum AttendanceStatus {
  Present = 'present',
  Late = 'late',
}

@Schema({
  timestamps: true,
})
export class Attendance {
  @Prop({ type: Types.ObjectId, ref: 'Session', required: true, index: true })
  sessionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({
    type: String,
    enum: AttendanceStatus,
    required: true,
  })
  status: AttendanceStatus;

  @Prop({ required: true })
  scannedAt: Date;

  @Prop({ required: false })
  ipAddress?: string;

  @Prop({ required: false })
  userAgent?: string;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

AttendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
