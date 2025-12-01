# AutoLab Teacher Workflow Documentation

This directory contains comprehensive documentation for the AutoLab Teacher mobile application workflow, capabilities, endpoints, and DTOs.

## Documentation Structure

### Core Workflows

1. **[Authentication & Onboarding](./authentication.md)**
   - Register and login workflows
   - JWT token management
   - Authentication DTOs

2. **[Lab Management](./lab-management.md)**
   - View assigned labs
   - Manage students
   - Request lab archiving

3. **[Session Management](./session-management.md)**
   - Create and view sessions
   - Manage live streaming
   - Upload recorded videos

4. **[Attendance Management](./attendance-management.md)**
   - Generate QR codes
   - View attendance records
   - Track student attendance

5. **[Grading & Evaluation](./grading.md)**
   - Create grades
   - View grade reports
   - Filter by category

6. **[File Management](./file-management.md)**
   - Upload files
   - View and filter files
   - Generate download URLs

7. **[Chat & Communication](./chat.md)**
   - Lab-specific chats
   - Teachers lobby
   - Real-time messaging

8. **[User Management](./user-management.md)**
   - View users
   - Search students
   - View user details

### Technical Documentation

9. **[WebSocket Streaming](./websocket-streaming.md)**
   - Live video streaming
   - Mediasoup SFU integration
   - WebRTC events and flow

10. **[Flutter Packages](./flutter-packages.md)**
    - Recommended dependencies
    - Complete pubspec.yaml example
    - Package descriptions

## Quick Start

1. Start with [Authentication & Onboarding](./authentication.md) to understand the login flow
2. Review [Lab Management](./lab-management.md) to understand how teachers access their labs
3. Explore [Session Management](./session-management.md) for creating and managing sessions
4. Check [WebSocket Streaming](./websocket-streaming.md) for live streaming implementation
5. Refer to [Flutter Packages](./flutter-packages.md) for development dependencies

## Important Notes

- **Teachers CANNOT create labs** - Only admins can create labs
- Teachers can only manage labs where they are assigned as the teacher
- All endpoints require JWT authentication with `Authorization: Bearer <accessToken>` header
- WebSocket connections require authentication (token or userId/role)
- Live streaming uses mediasoup SFU for scalable WebRTC connections (20+ students per lab)

## API Base URL

All REST endpoints are relative to the base API URL. Make sure to configure this in your Flutter app.

```
https://your-api-domain.com/api
```

## WebSocket URL

```
wss://your-api-domain.com/ws/streaming
```

## Common Patterns

### Authentication Header
```dart
headers: {
  'Authorization': 'Bearer $accessToken',
  'Content-Type': 'application/json',
}
```

### Error Handling
All endpoints return standard HTTP status codes. Handle errors appropriately:
- `401`: Unauthorized - Token expired or invalid
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource doesn't exist
- `400`: Bad Request - Invalid input
- `500`: Internal Server Error - Server error

### Pagination
Many endpoints support pagination using `limit` and `offset` query parameters:
- Default `limit`: 50
- Default `offset`: 0
- Maximum `limit`: 200

---

**Last Updated**: Generated for AutoLab Teacher Workflow Documentation





