# Teacher Authentication & Onboarding

This document covers the authentication workflow and onboarding process for teachers in the AutoLab platform.

## Workflow

1. Teacher registers with email, name, and password
2. Teacher logs in with email and password
3. System returns JWT access token and refresh token
4. Access token is stored securely and used for all subsequent API calls

## Endpoints

### Register
```
POST /auth/register
```

**Request Body** (`RegisterDto`):
```json
{
  "name": "string (required)",
  "email": "string (required, valid email)",
  "password": "string (required, min 8 characters)",
  "role": "teacher (optional, defaults to 'student' if not admin)"
}
```

**Response** (`AuthResponseDto`):
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "teacher",
    "isSuspended": false,
    "suspendedAt": null,
    "suspendReason": null
  }
}
```

### Login
```
POST /auth/login
```

**Request Body** (`LoginDto`):
```json
{
  "email": "string (required, valid email)",
  "password": "string (required)"
}
```

**Response** (`AuthResponseDto`):
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "teacher",
    "isSuspended": false,
    "suspendedAt": null,
    "suspendReason": null
  }
}
```

## DTOs

### RegisterDto
- `name` (string, required): Teacher's full name
- `email` (string, required, valid email): Teacher's email address
- `password` (string, required, min 8 characters): Account password
- `role` (UserRole, optional): User role (defaults to 'student' if not admin)

### LoginDto
- `email` (string, required, valid email): Teacher's email address
- `password` (string, required): Account password

### AuthResponseDto
- `accessToken` (string): JWT access token for API authentication
- `refreshToken` (string): JWT refresh token for token renewal
- `user` (object): User information
  - `id` (string): User ID
  - `name` (string): User's full name
  - `email` (string): User's email address
  - `role` (string): User role ("teacher")
  - `isSuspended` (boolean, optional): Whether the user is suspended
  - `suspendedAt` (string, optional): Suspension timestamp
  - `suspendReason` (string, optional): Reason for suspension

## Important Notes

- All API requests require `Authorization: Bearer <accessToken>` header
- If the user is suspended, authentication will fail
- Access tokens should be stored securely (use `flutter_secure_storage`)
- Refresh tokens can be used to obtain new access tokens when they expire





