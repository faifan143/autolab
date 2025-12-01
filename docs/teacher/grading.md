# Teacher Grading & Evaluation

This document covers grading and evaluation capabilities for teachers, including creating grades and viewing grade reports.

## Workflow

1. Teacher creates a grade for a student in a lab
2. Teacher views all grades for a specific lab
3. Teacher views all grades for a specific student
4. Teacher filters grades by category (quiz, assignment, report, etc.)

## Endpoints

### Create Grade
```
POST /grades
```

**Request Body** (`CreateGradeDto`):
```json
{
  "studentId": "string (required, MongoDB ObjectId)",
  "labId": "string (required, MongoDB ObjectId)",
  "category": "string (required, e.g., 'quiz', 'assignment', 'report', 'exam')",
  "score": "number (required)",
  "maxScore": "number (optional, positive integer)",
  "comment": "string (optional)"
}
```

**Response**:
```json
{
  "id": "string",
  "studentId": "string",
  "student": { ... },
  "labId": "string",
  "lab": { ... },
  "category": "string",
  "score": 85,
  "maxScore": 100,
  "percentage": 85,
  "comment": "string",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

**Access Control**: Teacher can only create grades for students enrolled in their labs.

### View Grades for Lab
```
GET /grades/labs/:labId
```

**Response**:
```json
[
  {
    "id": "string",
    "studentId": "string",
    "student": { ... },
    "labId": "string",
    "lab": { ... },
    "category": "string",
    "score": 85,
    "maxScore": 100,
    "percentage": 85,
    "comment": "string",
    "createdAt": "ISO timestamp",
    "updatedAt": "ISO timestamp"
  }
]
```

**Access Control**: Teacher can only view grades for their labs.

### View Grades for Student
```
GET /grades/students/:studentId?labId=xxx
```

**Query Parameters**:
- `labId` (optional): Filter by lab

**Response**:
```json
[
  {
    "id": "string",
    "studentId": "string",
    "student": { ... },
    "labId": "string",
    "lab": { ... },
    "category": "string",
    "score": 85,
    "maxScore": 100,
    "percentage": 85,
    "comment": "string",
    "createdAt": "ISO timestamp",
    "updatedAt": "ISO timestamp"
  }
]
```

**Access Control**: Teacher can only view grades for students enrolled in their labs.

## DTOs

### CreateGradeDto
- `studentId` (string, required, MongoDB ObjectId): Student's user ID
- `labId` (string, required, MongoDB ObjectId): Lab ID
- `category` (string, required): Grade category (e.g., "quiz", "assignment", "report", "exam")
- `score` (number, required): Score value
- `maxScore` (number, optional, positive integer): Maximum possible score
- `comment` (string, optional): Additional comment or feedback

### QueryGradesDto
- `labId` (string, optional, MongoDB ObjectId): Filter by lab ID

### Grade Response
- `id` (string): Grade ID
- `studentId` (string): Student's user ID
- `student` (object): Student information
- `labId` (string): Lab ID
- `lab` (object): Lab information
- `category` (string): Grade category
- `score` (number): Score value
- `maxScore` (number): Maximum possible score
- `percentage` (number): Calculated percentage (score / maxScore * 100)
- `comment` (string, nullable): Additional comment
- `createdAt` (string): Creation timestamp
- `updatedAt` (string): Last update timestamp





