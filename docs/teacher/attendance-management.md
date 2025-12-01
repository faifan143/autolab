# Teacher Attendance Management

This document covers attendance management for teachers, including QR code generation and viewing attendance records.

## Workflow

1. Teacher creates a session
2. Teacher generates a time-bound QR code for attendance
3. Students scan the QR code within the validity window
4. Teacher views real-time attendance for the session
5. Teacher views attendance history for specific students
6. Teacher receives real-time attendance updates via WebSocket

## Endpoints

### Generate Attendance QR Code
```
POST /attendance/:sessionId/qr
```

**Request Body** (`GenerateAttendanceQrDto`):
```json
{
  "expiresInMinutes": "number (optional, positive integer, default: 15)"
}
```

**Response**:
```json
{
  "qrToken": "string",
  "qrCode": "string (base64 encoded QR code image or data URL)",
  "expiresAt": "ISO timestamp",
  "sessionId": "string"
}
```

**Access Control**: Teacher can only generate QR codes for sessions in labs where they are the assigned teacher.

**Note**: The QR token is time-bound. After expiration, students cannot use it to mark attendance. The teacher can generate a new QR code if needed.

### View Session Attendance
```
GET /attendance/sessions/:sessionId
```

**Response**:
```json
{
  "sessionId": "string",
  "session": { ... },
  "attendance": [
    {
      "id": "string",
      "studentId": "string",
      "student": {
        "id": "string",
        "name": "string",
        "email": "string"
      },
      "sessionId": "string",
      "status": "present" | "late" | "absent",
      "timestamp": "ISO timestamp",
      "scannedAt": "ISO timestamp"
    }
  ],
  "summary": {
    "present": 10,
    "late": 2,
    "absent": 5,
    "total": 17
  }
}
```

**Access Control**: Teacher can only view attendance for sessions in labs where they are the assigned teacher.

### View Student Attendance
```
GET /attendance/students/:studentId?labId=xxx&sessionId=xxx
```

**Query Parameters**:
- `labId` (optional): Filter by lab
- `sessionId` (optional): Filter by session

**Response**:
```json
[
  {
    "id": "string",
    "studentId": "string",
    "student": { ... },
    "sessionId": "string",
    "session": { ... },
    "status": "present" | "late" | "absent",
    "timestamp": "ISO timestamp",
    "scannedAt": "ISO timestamp"
  }
]
```

**Access Control**: Teacher can view attendance for students enrolled in their labs.

## DTOs

### GenerateAttendanceQrDto
- `expiresInMinutes` (number, optional, positive integer): QR code expiration time in minutes (default: 15)

### Attendance Response
- `id` (string): Attendance record ID
- `studentId` (string): Student's user ID
- `student` (object): Student information
- `sessionId` (string): Session ID
- `session` (object): Session information (optional)
- `status` (string): Attendance status ("present" | "late" | "absent")
- `timestamp` (string): Attendance timestamp
- `scannedAt` (string): QR scan timestamp

### Session Attendance Summary
- `sessionId` (string): Session ID
- `session` (object): Session information
- `attendance` (array): Array of attendance records
- `summary` (object): Attendance summary
  - `present` (number): Number of present students
  - `late` (number): Number of late students
  - `absent` (number): Number of absent students
  - `total` (number): Total number of students





