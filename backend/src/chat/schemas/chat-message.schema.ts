import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({
  timestamps: true,
})
export class ChatMessage {
  @Prop({ required: true, trim: true })
  channel: string;

  @Prop({ type: Types.ObjectId, ref: 'Lab' })
  labId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  recipientIds: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'StoredFile', default: [] })
  fileIds: Types.ObjectId[];

  @Prop({ trim: true })
  content?: string;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

ChatMessageSchema.index({ channel: 1, createdAt: -1 });






