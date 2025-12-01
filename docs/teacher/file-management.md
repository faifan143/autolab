# Teacher File Management

This document covers file management capabilities for teachers, including uploading files and managing file access.

## Workflow

1. Teacher uploads files (PDFs, images, videos, voice notes) to labs or sessions
2. Teacher views files with filters (by lab, session, owner)
3. Teacher generates signed download URLs for files
4. Files are stored in Backblaze B2 cloud storage

## Endpoints

### Upload File
```
POST /files
Content-Type: multipart/form-data
```

**Request**:
- **Form Field**: `file` (file, max 25MB)
- **Form Field**: `labId` (optional, MongoDB ObjectId)
- **Form Field**: `sessionId` (optional, MongoDB ObjectId)
- **Form Field**: `description` (optional, string)

**Request Body** (`UploadFileDto`):
```json
{
  "labId": "string (optional, MongoDB ObjectId)",
  "sessionId": "string (optional, MongoDB ObjectId)",
  "description": "string (optional)"
}
```

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

**Access Control**: Teacher can upload files to labs where they are the assigned teacher or sessions within those labs.

### View Files
```
GET /files?labId=xxx&sessionId=xxx&ownerId=xxx
```

**Query Parameters**:
- `labId` (optional): Filter by lab
- `sessionId` (optional): Filter by session
- `ownerId` (optional): Filter by file owner

**Response**: Array of file objects
```json
[
  {
    "id": "string",
    "fileName": "string",
    "mimeType": "string",
    "size": 1024,
    "url": "string",
    "labId": "string",
    "sessionId": "string",
    "ownerId": "string",
    "owner": { ... },
    "description": "string",
    "createdAt": "ISO timestamp"
  }
]
```

**Access Control**: Teacher can view files for labs where they are the assigned teacher.

### Get Download URL
```
GET /files/:id/url
```

**Response**:
```json
{
  "url": "string (signed download URL, expires after some time)",
  "expiresAt": "ISO timestamp"
}
```

**Access Control**: Teacher can get download URLs for files in their labs.

## DTOs

### UploadFileDto
- `labId` (string, optional, MongoDB ObjectId): Lab ID to associate file with
- `sessionId` (string, optional, MongoDB ObjectId): Session ID to associate file with
- `description` (string, optional): File description

### File Response
- `id` (string): File ID
- `fileName` (string): Original file name
- `mimeType` (string): MIME type of the file
- `size` (number): File size in bytes
- `url` (string): Signed URL for file access
- `labId` (string, nullable): Associated lab ID
- `sessionId` (string, nullable): Associated session ID
- `ownerId` (string): File owner's user ID
- `owner` (object, optional): File owner information
- `description` (string, nullable): File description
- `createdAt` (string): Creation timestamp

### Download URL Response
- `url` (string): Signed download URL (expires after some time)
- `expiresAt` (string): URL expiration timestamp





