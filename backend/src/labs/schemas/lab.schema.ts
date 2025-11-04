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
}

export const LabSchema = SchemaFactory.createForClass(Lab);

LabSchema.index({ teacherId: 1 });
