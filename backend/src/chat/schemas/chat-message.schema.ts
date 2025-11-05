import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({
  timestamps: true,
})
export class ChatMessage {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  recipientIds: Types.ObjectId[];

  @Prop({ required: true, trim: true })
  channel: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Map, of: Boolean, default: {} })
  readBy: Map<string, boolean>;

  @Prop({ type: Types.ObjectId, ref: 'Lab' })
  labId?: Types.ObjectId;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

ChatMessageSchema.index({ channel: 1, createdAt: 1 });
