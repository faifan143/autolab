import { UseGuards } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AttendanceStatus } from './schemas/attendance.schema';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import type { ChatMessageResponse } from '../chat/chat.service';
import type { AdminOverview } from '../admin/admin.service';

export interface AttendanceUpdateEvent {
  sessionId: string;
  labId: string;
  studentId: string;
  studentName?: string;
  status: AttendanceStatus;
  scannedAt: string;
}

export interface AttendanceSummaryEvent {
  sessionId: string;
  labId: string;
  present: number;
  late: number;
  total: number;
}

@WebSocketGateway({
  namespace: '/ws/teachers',
  cors: {
    origin: '*',
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
export class AttendanceGateway {
  @WebSocketServer()
  private readonly server: Server;

  emitAttendanceUpdate(event: AttendanceUpdateEvent) {
    this.server.emit('attendanceUpdate', event);
  }

  /**
   * New typed event for attendance summaries per session.
   */
  emitAttendanceSummary(event: AttendanceSummaryEvent) {
    this.server.emit('attendance:updated', event);
  }

  /**
   * New typed event for newly created chat messages.
   */
  emitChatMessageCreated(message: ChatMessageResponse) {
    this.server.emit('chat:message-created', message);
  }

  /**
   * Emit latest dashboard overview data to connected teachers/admins.
   */
  emitDashboardOverview(overview: AdminOverview) {
    this.server.emit('dashboard:overview-updated', overview);
  }
}
