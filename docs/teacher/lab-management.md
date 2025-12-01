# Teacher Lab Management

This document covers lab management capabilities for teachers, including viewing assigned labs, managing students, and requesting lab archiving.

## Workflow

1. Teacher logs in and views their assigned labs
2. Teacher selects a lab to view details (students, sessions, status)
3. Teacher can view all sessions for a lab
4. Teacher can add/remove students from their labs
5. Teacher can request lab archiving (requires admin approval)

## Important Notes

- **Teachers CANNOT create labs** - Only admins can create labs
- Teachers can only view and manage labs where they are assigned as the teacher
- Teachers can only add/remove students from their own labs

## Endpoints

### View Assigned Labs
```
GET /labs
```

**Response**: Array of `LabResponse`
```json
[
  {
    "id": "string",
    "name": "string",
    "teacherId": "string",
    "teacher": {
      "id": "string",
      "name": "string",
      "email": "string"
    },
    "studentIds": ["string"],
    "students": [
      {
        "id": "string",
        "name": "string",
        "email": "string"
      }
    ],
    "isArchived": false,
    "archivedAt": null,
    "isSuspended": false,
    "suspendedAt": null,
    "suspendReason": null,
    "archiveRequested": false,
    "archiveRequestedAt": null,
    "archiveRequestReason": null,
    "createdAt": "ISO timestamp",
    "updatedAt": "ISO timestamp"
  }
]
```

**Access Control**: Returns only labs where `teacherId` matches the authenticated teacher.

### View Lab Details
```
GET /labs/:id
```

**Response** (`LabResponse`):
```json
{
  "id": "string",
  "name": "string",
  "teacherId": "string",
  "teacher": { ... },
  "studentIds": ["string"],
  "students": [ ... ],
  "isArchived": false,
  "archivedAt": null,
  "isSuspended": false,
  "suspendedAt": null,
  "suspendReason": null,
  "archiveRequested": false,
  "archiveRequestedAt": null,
  "archiveRequestReason": null,
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

**Access Control**: Teacher can only view labs where they are the assigned teacher.

### View Lab Sessions
```
GET /labs/:labId/sessions
```

**Response**: Array of `SessionResponse`
```json
[
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
]
```

**Access Control**: Teacher can only view sessions for labs where they are the assigned teacher.

### Add/Remove Students
```
PATCH /labs/:id/students
```

**Request Body** (`UpdateLabStudentsDto`):
```json
{
  "studentIds": ["string"] // Array of student MongoDB ObjectIds
}
```

**Response** (`LabResponse`):
```json
{
  "id": "string",
  "name": "string",
  "teacherId": "string",
  "studentIds": ["string"],
  ...
}
```

**Access Control**: Teacher can only modify labs where they are the assigned teacher.

### Request Lab Archiving
```
POST /labs/:id/archive-request
```

**Request Body** (`ArchiveRequestDto`):
```json
{
  "reason": "string (optional, max 1000 characters)"
}
```

**Response** (`LabResponse`):
```json
{
  "id": "string",
  "name": "string",
  ...
  "archiveRequested": true,
  "archiveRequestedAt": "ISO timestamp",
  "archiveRequestReason": "string"
}
```

**Access Control**: Teacher can only request archiving for labs where they are the assigned teacher.

**Note**: Archive requests require admin approval. The teacher will be notified when the admin approves or rejects the request.

## DTOs

### UpdateLabStudentsDto
- `studentIds` (array of strings, required): Array of student MongoDB ObjectIds

### ArchiveRequestDto
- `reason` (string, optional, max 1000 characters): Reason for archiving the lab

### LabResponse
- `id` (string): Lab ID
- `name` (string): Lab name
- `teacherId` (string): Teacher's user ID
- `teacher` (object): Teacher information
- `studentIds` (array of strings): Array of student IDs
- `students` (array of objects): Array of student information
- `isArchived` (boolean): Whether the lab is archived
- `archivedAt` (string, nullable): Archival timestamp
- `isSuspended` (boolean): Whether the lab is suspended
- `suspendedAt` (string, nullable): Suspension timestamp
- `suspendReason` (string, nullable): Reason for suspension
- `archiveRequested` (boolean): Whether archive has been requested
- `archiveRequestedAt` (string, nullable): Archive request timestamp
- `archiveRequestReason` (string, nullable): Reason for archive request
- `createdAt` (string): Creation timestamp
- `updatedAt` (string): Last update timestamp





