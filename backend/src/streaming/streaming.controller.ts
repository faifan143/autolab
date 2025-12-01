import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { MediasoupService } from './mediasoup.service';

// DTOs kept intentionally minimal and feature-flag friendly.
class JoinRoomDto {
  // Placeholder for future metadata (e.g., role, displayName)
}

class CreateTransportDto {
  direction: 'send' | 'recv';
}

class ConnectTransportDto {
  dtlsParameters: any;
}

class ProduceDto {
  transportId: string;
  kind: 'audio' | 'video';
  rtpParameters: any;
}

class ConsumeDto {
  transportId: string;
  producerId: string;
  rtpCapabilities: any;
}

@Controller('streaming')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Teacher, UserRole.Admin)
export class StreamingController {
  constructor(private readonly mediasoupService: MediasoupService) {}

  @Get('rtp-capabilities')
  async getRtpCapabilities() {
    const caps = await this.mediasoupService.getRouterRtpCapabilities(
      'default',
    );
    return caps;
  }

  @Post('rooms/:roomId/join')
  async joinRoom(@Param('roomId') roomId: string, @Body() _dto: JoinRoomDto) {
    // Currently a no-op that ensures the room exists.
    const room = await this.mediasoupService.getOrCreateRoom(roomId);
    return { roomId: room.id };
  }

  @Post('rooms/:roomId/transports')
  async createTransport(
    @Param('roomId') roomId: string,
    @Body() dto: CreateTransportDto,
  ) {
    const { transport, params } =
      await this.mediasoupService.createWebRtcTransportForRoom(
        roomId,
        dto.direction,
        'anonymous',
      );
    // params already contains the transport id, iceParameters, iceCandidates, dtlsParameters
    return params;
  }

  @Post('rooms/:roomId/transports/:id/connect')
  async connectTransport(
    @Param('roomId') _roomId: string,
    @Param('id') id: string,
    @Body() dto: ConnectTransportDto,
  ) {
    await this.mediasoupService.connectTransport(id, dto.dtlsParameters);
    return { connected: true };
  }

  @Post('rooms/:roomId/producers')
  async createProducer(
    @Param('roomId') roomId: string,
    @Body() dto: ProduceDto,
  ) {
    const producer = await this.mediasoupService.createProducer(
      roomId,
      dto.transportId,
      dto.rtpParameters,
    );
    await this.mediasoupService.addProducerToRoom(roomId, producer);
    return { id: producer.id, kind: producer.kind };
  }

  @Post('rooms/:roomId/consumers')
  async createConsumer(
    @Param('roomId') roomId: string,
    @Body() dto: ConsumeDto,
  ) {
    const { consumer, params } = await this.mediasoupService.createConsumer(
      roomId,
      dto.transportId,
      dto.producerId,
      dto.rtpCapabilities,
    );
    return {
      id: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: params.rtpParameters,
    };
  }
}


