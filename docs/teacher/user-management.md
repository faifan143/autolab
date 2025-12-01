# Teacher User Management

This document covers user management capabilities for teachers, including viewing users and searching for students.

## Workflow

1. Teacher views list of users (especially students)
2. Teacher searches and filters users
3. Teacher views user details

## Important Notes

- Teachers cannot modify or suspend users - only admins can do that
- Teachers primarily use this to view and search for students

## Endpoints

### View Users
```
GET /users?role=student&search=john&limit=50&offset=0
```

**Query Parameters**:
- `role` (optional): Filter by role (`student`, `teacher`, `admin`)
- `search` (optional): Search by name or email
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
[
  {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "student",
    "isSuspended": false,
    "suspendedAt": null,
    "suspendReason": null,
    "createdAt": "ISO timestamp",
    "updatedAt": "ISO timestamp"
  }
]
```

**Access Control**: Teacher can view users, especially students.

### View User Details
```
GET /users/:id
```

**Response**:
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "role": "student",
  "isSuspended": false,
  "suspendedAt": null,
  "suspendReason": null,
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

**Access Control**: Teacher can view user details.

## User Response

- `id` (string): User ID
- `name` (string): User's full name
- `email` (string): User's email address
- `role` (string): User role ("student", "teacher", or "admin")
- `isSuspended` (boolean): Whether the user is suspended
- `suspendedAt` (string, nullable): Suspension timestamp
- `suspendReason` (string, nullable): Reason for suspension
- `createdAt` (string): Account creation timestamp
- `updatedAt` (string): Last update timestamp





