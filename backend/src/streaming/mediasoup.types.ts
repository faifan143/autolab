import type { Router, Transport, Producer, Consumer } from 'mediasoup/types';

export type MediasoupRoomId = string;

export interface MediasoupRoom {
  id: MediasoupRoomId;
  router: Router;
  transports: Map<string, Transport>;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
}


