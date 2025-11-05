export interface ChatMessageResponse {
  id: string;
  channel: string;
  content: string;
  senderId: string;
  recipientIds: string[];
  labId?: string;
  createdAt: string;
}

