# Teacher WebSocket Streaming

This document covers WebSocket-based real-time features for teachers, particularly live video streaming using mediasoup SFU.

## WebSocket Gateway

**Endpoint**: `/ws/streaming`

The platform uses WebSocket for real-time communication, particularly for live video streaming using mediasoup SFU (Selective Forwarding Unit).

## Connection

### Connect to WebSocket
```
WS /ws/streaming
```

**Connection Headers**:
```
Authorization: Bearer <accessToken>
```

**Connection Auth** (alternative):
```javascript
socket.handshake.auth = {
  userId: "string",
  role: "teacher"
}
```

## Events for Live Streaming

### Get Router RTP Capabilities

**Client → Server**:
```json
{
  "event": "get-router-rtp-capabilities",
  "payload": {
    "sessionId": "string"
  }
}
```

**Server → Client**:
```json
{
  "event": "router-rtp-capabilities",
  "data": {
    "sessionId": "string",
    "rtpCapabilities": { ... }
  }
}
```

### Create Transport

**Client → Server**:
```json
{
  "event": "create-transport",
  "payload": {
    "sessionId": "string",
    "type": "producer" | "consumer"
  }
}
```

**Server → Client**:
```json
{
  "event": "transport-created",
  "data": {
    "transportId": "string",
    "iceParameters": { ... },
    "iceCandidates": [ ... ],
    "dtlsParameters": { ... }
  }
}
```

### Connect Transport

**Client → Server**:
```json
{
  "event": "connect-transport",
  "payload": {
    "transportId": "string",
    "dtlsParameters": { ... }
  }
}
```

### Produce (Publish Stream)

**Client → Server**:
```json
{
  "event": "produce",
  "payload": {
    "transportId": "string",
    "kind": "audio" | "video",
    "rtpParameters": { ... }
  }
}
```

**Server → Client**:
```json
{
  "event": "producer-created",
  "data": {
    "producerId": "string"
  }
}
```

### Consume (Receive Stream)

**Client → Server**:
```json
{
  "event": "consume",
  "payload": {
    "transportId": "string",
    "producerId": "string",
    "rtpCapabilities": { ... }
  }
}
```

**Server → Client**:
```json
{
  "event": "consumer-created",
  "data": {
    "consumerId": "string",
    "kind": "audio" | "video",
    "rtpParameters": { ... },
    "producerId": "string"
  }
}
```

### Get Producers (Get Active Streams)

**Client → Server**:
```json
{
  "event": "get-producers",
  "payload": {
    "sessionId": "string"
  }
}
```

**Server → Client**:
```json
{
  "event": "producers-list",
  "data": {
    "sessionId": "string",
    "producerIds": ["string"]
  }
}
```

### Stop Stream

**Client → Server**:
```json
{
  "event": "stop-stream",
  "payload": {
    "sessionId": "string"
  }
}
```

## Error Events

**Server → Client**:
```json
{
  "event": "stream-error",
  "data": {
    "message": "string"
  }
}
```

## Real-time Features

### Attendance Updates

Attendance updates are broadcasted via WebSocket when students mark their attendance. The teacher should listen for attendance update events.

### Chat Updates

Chat messages are broadcasted via WebSocket. The teacher should listen for new message events.

## WebRTC Flow for Teachers

1. Teacher starts stream via REST API (`POST /sessions/:id/stream/start`)
2. Teacher connects to WebSocket (`/ws/streaming`)
3. Teacher gets router RTP capabilities
4. Teacher creates producer transport
5. Teacher connects transport
6. Teacher produces (publishes) audio/video stream
7. Students consume the stream via their consumer transports
8. Teacher stops stream via REST API (`POST /sessions/:id/stream/stop`)

## Notes

- The mediasoup SFU scales to 20+ students per lab
- All WebRTC connections go through the SFU, reducing bandwidth usage
- The teacher publishes one stream; the SFU distributes it to all students
- Use `flutter_webrtc` package for WebRTC implementation in Flutter





