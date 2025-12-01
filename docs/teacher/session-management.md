# Teacher Session Management

This document covers session management for teachers, including creating sessions, managing live streaming, and uploading recorded videos.

## Workflow

1. Teacher creates a session for a lab (with start/end time)
2. Teacher views session details
3. Teacher generates QR code for attendance (time-bound)
4. Teacher can start live video streaming for the session
5. Students join the stream via WebRTC
6. Teacher stops the stream
7. Teacher uploads recorded video to session assets (if applicable)

## Endpoints

### Create Session
```
POST /sessions
```

**Request Body** (`CreateSessionDto`):
```json
{
  "labId": "string (required, MongoDB ObjectId)",
  "startTime": "ISO 8601 date string (required)",
  "endTime": "ISO 8601 date string (required)"
}
```

**Response** (`SessionResponse`):
```json
{
  "id": "string",
  "labId": "string",
  "lab": { ... },
  "startTime": "ISO timestamp",
  "endTime": "ISO timestamp",
  "isStreaming": false,
  "streamUrl": null,
  "streamKey": null,
  "streamStartedAt": null,
  "streamEndedAt": null,
  "qrToken": null,
  "qrTokenExpiresAt": null,
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

**Access Control**: Teacher can only create sessions for labs where they are the assigned teacher.

### View Session Details
```
GET /sessions/:id
```

**Response** (`SessionResponse`):
```json
{
  "id": "string",
  "labId": "string",
  "lab": { ... },
  "startTime": "ISO timestamp",
  "endTime": "ISO timestamp",
  "isStreaming": false,
  "streamUrl": null,
  "streamKey": null,
  "streamStartedAt": null,
  "streamEndedAt": null,
  "qrToken": null,
  "qrTokenExpiresAt": null,
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

**Access Control**: Teacher can view sessions for labs where they are the assigned teacher.

### Start Live Stream
```
POST /sessions/:id/stream/start
```

**Request Body** (`StartStreamDto`):
```json
{
  "streamUrl": "string (optional, max 500 characters)",
  "streamKey": "string (optional, max 200 characters)"
}
```

**Response** (`SessionResponse`):
```json
{
  "id": "string",
  ...
  "isStreaming": true,
  "streamUrl": "string",
  "streamKey": "string",
  "streamStartedAt": "ISO timestamp",
  ...
}
```

**Access Control**: Teacher can only start streams for sessions in labs where they are the assigned teacher.

**Note**: After starting a stream, the teacher should connect to the WebSocket gateway (`/ws/streaming`) to establish WebRTC connection using mediasoup SFU. See `websocket-streaming.md` for WebSocket events.

### Stop Live Stream
```
POST /sessions/:id/stream/stop
```

**Response** (`SessionResponse`):
```json
{
  "id": "string",
  ...
  "isStreaming": false,
  "streamEndedAt": "ISO timestamp",
  ...
}
```

**Access Control**: Teacher can only stop streams for sessions in labs where they are the assigned teacher.

### Upload Recorded Video
```
POST /sessions/:id/stream-video
Content-Type: multipart/form-data
```

**Request**:
- **Form Field**: `video` (file, video MIME types only, max 500MB)
  - Allowed types: `video/*`, `application/x-mpegURL`, `application/vnd.apple.mpegurl`

**Response**:
```json
{
  "id": "string",
  "fileName": "string",
  "mimeType": "string",
  "size": 1024,
  "url": "string (signed URL)",
  "labId": "string",
  "sessionId": "string",
  "ownerId": "string",
  "description": "string",
  "createdAt": "ISO timestamp"
}
```

**Access Control**: Teacher can only upload videos for sessions in labs where they are the assigned teacher.

**Note**: This endpoint uploads the video file to the session's assets. After stopping a live stream, the teacher can upload the recorded video using this endpoint.

## DTOs

### CreateSessionDto
- `labId` (string, required, MongoDB ObjectId): Lab ID
- `startTime` (string, required, ISO 8601 date): Session start time
- `endTime` (string, required, ISO 8601 date): Session end time

### StartStreamDto
- `streamUrl` (string, optional, max 500 characters): Stream URL
- `streamKey` (string, optional, max 200 characters): Stream key

### SessionResponse
- `id` (string): Session ID
- `labId` (string): Lab ID
- `lab` (object): Lab information
- `startTime` (string): Session start time
- `endTime` (string): Session end time
- `isStreaming` (boolean): Whether session is currently streaming
- `streamUrl` (string, nullable): Stream URL
- `streamKey` (string, nullable): Stream key
- `streamStartedAt` (string, nullable): Stream start timestamp
- `streamEndedAt` (string, nullable): Stream end timestamp
- `qrToken` (string, nullable): QR token for attendance
- `qrTokenExpiresAt` (string, nullable): QR token expiration timestamp
- `createdAt` (string): Creation timestamp
- `updatedAt` (string): Last update timestamp





