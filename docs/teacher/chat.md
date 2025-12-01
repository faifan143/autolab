# Teacher Chat & Communication

This document covers chat and communication capabilities for teachers, including lab chats and teachers lobby.

## Workflow

1. Teacher sends messages to lab-specific chats (visible to lab students, teacher, and admin)
2. Teacher sends messages to teachers lobby (all teachers + admin)
3. Teacher views chat history with pagination
4. Teacher receives real-time message updates via WebSocket

## Channels

- **Lab Chat**: `lab:<labId>` - Accessible to lab's teacher, students, and admin
- **Teachers Lobby**: `teachers:lobby` - Accessible to all teachers and admin

## Endpoints

### Send Message
```
POST /chat/messages
```

**Request Body** (`SendMessageDto`):
```json
{
  "channel": "string (required, 'lab:<labId>' or 'teachers:lobby', max 200 characters)",
  "content": "string (required, 1-4000 characters)",
  "labId": "string (optional, required if channel is 'lab:<labId>')",
  "recipientIds": ["string"] // (optional, array of MongoDB ObjectIds)
}
```

**Response**:
```json
{
  "id": "string",
  "channel": "lab:<labId>",
  "labId": "string",
  "senderId": "string",
  "sender": { ... },
  "recipientIds": ["string"],
  "recipients": [ ... ],
  "content": "string",
  "createdAt": "ISO timestamp"
}
```

**Access Control**:
- Teacher can send messages to lab chats for labs where they are the assigned teacher
- Teacher can send messages to teachers lobby

### View Messages
```
GET /chat/messages?channel=xxx&labId=xxx&limit=50&offset=0
```

**Query Parameters** (`QueryMessagesDto`):
- `channel` (required): Channel name (`lab:<labId>` or `teachers:lobby`)
- `labId` (optional): Required if channel is `lab:<labId>`
- `limit` (optional): Number of messages to return (1-200, default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
[
  {
    "id": "string",
    "channel": "lab:<labId>",
    "labId": "string",
    "senderId": "string",
    "sender": { ... },
    "recipientIds": ["string"],
    "recipients": [ ... ],
    "content": "string",
    "createdAt": "ISO timestamp"
  }
]
```

**Access Control**: Teacher can view messages for labs where they are the assigned teacher, and for teachers lobby.

## DTOs

### SendMessageDto
- `channel` (string, required, max 200 characters): Channel name (`lab:<labId>` or `teachers:lobby`)
- `content` (string, required, 1-4000 characters): Message content
- `labId` (string, optional, MongoDB ObjectId): Lab ID (required if channel is `lab:<labId>`)
- `recipientIds` (array of strings, optional): Array of recipient MongoDB ObjectIds

### QueryMessagesDto
- `channel` (string, required, max 200 characters): Channel name
- `labId` (string, optional, MongoDB ObjectId): Lab ID (required if channel is `lab:<labId>`)
- `limit` (number, optional, 1-200, default: 50): Number of messages to return
- `offset` (number, optional, default: 0): Pagination offset

### Message Response
- `id` (string): Message ID
- `channel` (string): Channel name
- `labId` (string, nullable): Lab ID
- `senderId` (string): Sender's user ID
- `sender` (object): Sender information
- `recipientIds` (array of strings): Array of recipient IDs
- `recipients` (array of objects): Array of recipient information
- `content` (string): Message content
- `createdAt` (string): Message creation timestamp





