import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AttendanceStatus } from './schemas/attendance.schema';

export interface AttendanceUpdateEvent {
  sessionId: string;
  labId: string;
  studentId: string;
  studentName?: string;
  status: AttendanceStatus;
  scannedAt: string;
}

@WebSocketGateway({
  namespace: '/ws/teachers',
})
export class AttendanceGateway {
  @WebSocketServer()
  private readonly server: Server;

  emitAttendanceUpdate(event: AttendanceUpdateEvent) {
    this.server.emit('attendanceUpdate', event);
  }
}
