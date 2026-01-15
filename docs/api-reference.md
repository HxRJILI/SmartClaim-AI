# API Reference

This document describes the SmartClaim AI API endpoints.

## Authentication

All API requests require authentication via Supabase JWT tokens.

```bash
Authorization: Bearer <your_jwt_token>
```

## Base URLs

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:3000/api` |
| Production | `https://your-domain.com/api` |

## Ticket Endpoints

### Create Ticket

```http
POST /api/smartclaim/ticket
```

**Request Body:**
```json
{
  "description": "string",
  "category": "safety|quality|maintenance|logistics|hr|other",
  "priority": "critical|high|medium|low",
  "attachments": ["file_url1", "file_url2"]
}
```

**Response:**
```json
{
  "id": "uuid",
  "ticket_number": "SC-2025-001",
  "status": "pending",
  "created_at": "2025-01-01T00:00:00Z"
}
```

### Get Ticket

```http
GET /api/smartclaim/ticket/:id
```

### List Tickets

```http
GET /api/smartclaim/tickets
```

**Query Parameters:**
- `status` - Filter by status
- `category` - Filter by category
- `priority` - Filter by priority
- `page` - Page number
- `limit` - Items per page

### Update Ticket

```http
PATCH /api/smartclaim/ticket/:id
```

## AI Service Endpoints

### Classify Text

```http
POST /api/smartclaim/classify
```

**Request Body:**
```json
{
  "text": "string",
  "language": "fr|en"
}
```

### Analyze Image

```http
POST /api/smartclaim/analyze-image
```

**Request Body:**
```json
{
  "image_url": "string"
}
```

### Transcribe Audio

```http
POST /api/smartclaim/transcribe
```

**Request Body:**
```json
{
  "audio_url": "string"
}
```

### Chat

```http
POST /api/smartclaim/chat
```

**Request Body:**
```json
{
  "message": "string",
  "history": [],
  "context": {}
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `INTERNAL_ERROR` | 500 | Server error |
