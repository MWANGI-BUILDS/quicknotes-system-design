# QuickNotes API Design

The production API uses JSON over HTTPS and versioned routes under `/v1`. Except for account creation and health checks, requests require an `Authorization: Bearer <access-token>` header. Resource identifiers are opaque UUIDs. Timestamps are UTC ISO 8601 strings.

## Endpoints

| Method | Path | Description | Success status |
| --- | --- | --- | --- |
| POST | `/v1/users` | Register a user and return a profile. | `201 Created` |
| POST | `/v1/auth/sessions` | Authenticate and issue an access token. | `200 OK` |
| GET | `/v1/notes` | List the authenticated user's notes; supports `limit`, `cursor`, `q`, and `tag`. | `200 OK` |
| POST | `/v1/notes` | Create a note for the authenticated user. | `201 Created` |
| GET | `/v1/notes/{noteId}` | Fetch one note owned by the authenticated user. | `200 OK` |
| PATCH | `/v1/notes/{noteId}` | Update supplied note fields. | `200 OK` |
| DELETE | `/v1/notes/{noteId}` | Delete a note owned by the authenticated user. | `204 No Content` |
| PUT | `/v1/notes/{noteId}/tags/{tagId}` | Attach an existing tag to a note. | `204 No Content` |
| DELETE | `/v1/notes/{noteId}/tags/{tagId}` | Detach a tag from a note. | `204 No Content` |
| GET | `/health` | Report service health for platform probes. | `200 OK` |

List responses are paginated and stable-sorted by `updatedAt` descending, then `id` ascending. A cursor is opaque and returned as `nextCursor`; clients should not infer its format. Mutations operate only on the caller's resources. The API returns `404` for absent or non-owned note IDs to avoid exposing another user's data.

## Create a Note

Request:

```http
POST /v1/notes HTTP/1.1
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "title": "Release checklist",
  "body": "Confirm monitoring and rollback steps.",
  "tagIds": ["tag_9c2f"]
}
```

Response (`201 Created`):

```json
{
  "data": {
    "id": "note_7f31",
    "title": "Release checklist",
    "body": "Confirm monitoring and rollback steps.",
    "createdAt": "2026-10-11T09:30:00Z",
    "updatedAt": "2026-10-11T09:30:00Z",
    "tags": [{ "id": "tag_9c2f", "name": "work" }]
  }
}
```

The authenticated principal supplies `userId`; clients cannot choose the owner. Titles are required and limited to 100 characters. Bodies are optional and limited to 20,000 characters. A repeated `Idempotency-Key` within its retention window returns the original creation result rather than creating a duplicate.

## List Notes

Request:

```http
GET /v1/notes?limit=2&cursor=eyJvZmZzZXQiOjJ9 HTTP/1.1
Authorization: Bearer <access-token>
```

Response (`200 OK`):

```json
{
  "data": [
    {
      "id": "note_7f31",
      "title": "Release checklist",
      "body": "Confirm monitoring and rollback steps.",
      "createdAt": "2026-10-11T09:30:00Z",
      "updatedAt": "2026-10-11T09:30:00Z",
      "tags": [{ "id": "tag_9c2f", "name": "work" }]
    },
    {
      "id": "note_4a20",
      "title": "Book dentist",
      "body": "Call on Monday.",
      "createdAt": "2026-10-10T16:00:00Z",
      "updatedAt": "2026-10-10T16:00:00Z",
      "tags": []
    }
  ],
  "pagination": {
    "nextCursor": "eyJvZmZzZXQiOjR9",
    "hasMore": true
  }
}
```

## Errors

Errors use a consistent envelope. Validation errors may include field-level details; internal exception text and secrets are never returned.

| Status | Meaning |
| --- | --- |
| `400 Bad Request` | Malformed JSON, invalid fields, or invalid pagination parameters. |
| `401 Unauthorized` | Missing, expired, or invalid credentials. |
| `403 Forbidden` | Authenticated caller lacks permission for the requested operation. |
| `404 Not Found` | Resource does not exist or is not visible to this caller. |
| `409 Conflict` | A unique constraint or idempotency key conflicts with current state. |
| `413 Content Too Large` | Request body exceeds the configured size limit. |
| `429 Too Many Requests` | Rate limit exceeded; response includes `Retry-After`. |
| `500 Internal Server Error` | Unexpected server failure. |
| `503 Service Unavailable` | Service is temporarily unable to accept requests. |

Example error body (`400 Bad Request`):

```json
{
  "error": {
    "code": "validation_error",
    "message": "The request contains invalid fields.",
    "details": [
      { "field": "title", "issue": "Title is required and must be 100 characters or fewer." }
    ],
    "requestId": "req_01J9ABC123"
  }
}
```