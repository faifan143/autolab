import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GradeDocument = Grade & Document;

@Schema({
  timestamps: true,
})
export class Grade {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Lab', required: true, index: true })
  labId: Types.ObjectId;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  score: number;

  @Prop()
  maxScore?: number;

  @Prop()
  comment?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  gradedBy: Types.ObjectId;
}

export const GradeSchema = SchemaFactory.createForClass(Grade);

GradeSchema.index({ studentId: 1, labId: 1, category: 1 }, { unique: true });
