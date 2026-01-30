# Research API

A Hono-based API for managing B2B contract legal research. This service handles contract uploads, research processing, and results management.

## Overview

This API manages legal research for B2B contracts. Users upload contracts, the system conducts multi-stage research through legal databases, and returns results with highlighted clauses categorized by severity (red/yellow/green).

## Tech Stack

- **Framework**: Hono
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle
- **Runtime**: Cloudflare Workers
- **Auth**: Clerk (user ID only, auth handled by separate service)

## Database Schema

### Research Table

| Field | Type | Description |
|-------|------|-------------|
| id | text (UUID) | Primary key |
| userId | text | User ID from Clerk |
| contractName | text | Name of the contract |
| contractUrl | text | URL to uploaded contract (e.g., R2 storage) |
| status | text | pending, in_progress, completed, failed |
| currentStage | text | Current stage of research process |
| results | text (JSON) | Research findings, highlighted clauses, severity levels |
| createdAt | timestamp | Creation timestamp |
| updatedAt | timestamp | Last update timestamp |
| completedAt | timestamp | Completion timestamp |
| errorMessage | text | Error message if failed |

## API Endpoints

### Health Check
```
GET /health
```
Returns service health status.

### Contracts

#### List Contracts
```
GET /contracts
x-user-id: <clerk-user-id>
```

Returns a list of all PDF contracts stored in the R2 bucket with their names and upload timestamps.

**Response:**
```json
{
  "contracts": [
    {
      "name": "contract-abc123.pdf",
      "uploadedAt": "2025-01-15T10:30:00.000Z"
    },
    {
      "name": "vendor-agreement-xyz789.pdf",
      "uploadedAt": "2025-01-16T14:20:00.000Z"
    }
  ],
  "count": 2,
  "truncated": false
}
```

**Fields:**
- `contracts`: Array of contract objects with name and upload timestamp
- `count`: Total number of contracts returned
- `truncated`: Boolean indicating if results were truncated (R2 pagination)

### Workflows

#### Trigger Contract Analysis (Parsing + Review)
```
POST /research/:id/parse
Content-Type: application/json
x-user-id: <clerk-user-id>

{
  "pdfBase64": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC...",
  "totalPages": 15
}
```

This single workflow performs both PDF parsing and contract risk review:
1. Parses each page of the PDF to extract contract blocks (accepts base64-encoded PDF data)
2. Reviews each block for legal risks (hidden fees, penalties, unclear terms, etc.)
3. Returns both parsed blocks and risk assessments

**Note**: The `pdfBase64` field should contain the base64-encoded PDF file data. The frontend should read the PDF file and convert it to base64 before sending.

#### Get Workflow Status
```
GET /research/:id/workflow/:workflowId
x-user-id: <clerk-user-id>
```

Returns the status of the contract analysis workflow. Status values:
- `queued`: Workflow is queued
- `running`: Workflow is currently executing
- `complete`: Workflow finished successfully (check `output` field)
- `error`: Workflow failed (check `output` for error details)

### Research Management

All research endpoints require the `x-user-id` header for authentication.

#### Create Research
```
POST /research
Content-Type: application/json
x-user-id: <clerk-user-id>

{
  "contractName": "Vendor Agreement 2024",
  "contractUrl": "https://storage.example.com/contracts/abc123.pdf"
}
```

#### Get All Research (for current user)
```
GET /research
x-user-id: <clerk-user-id>
```

#### Get Single Research
```
GET /research/:id
x-user-id: <clerk-user-id>
```

#### Update Research
```
PATCH /research/:id
Content-Type: application/json
x-user-id: <clerk-user-id>

{
  "contractName": "Updated Name",
  "status": "in_progress",
  "currentStage": "analyzing_clauses",
  "results": "{\"findings\": [...], \"highlights\": [...]}"
}
```

#### Update Research Status
```
PATCH /research/:id/status
Content-Type: application/json
x-user-id: <clerk-user-id>

{
  "status": "completed",
  "currentStage": "final",
  "results": "{\"findings\": [...], \"highlights\": [...]}"
}
```

#### Delete Research
```
DELETE /research/:id
x-user-id: <clerk-user-id>
```

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Generate database migrations
pnpm db:generate

# Apply migrations locally
pnpm db:migrate:local

# Start development server
pnpm dev
```

### Database Management

```bash
# Generate migrations after schema changes
pnpm db:generate

# Apply migrations locally
pnpm db:migrate:local

# Apply migrations to production
pnpm db:migrate:remote
```

### Type Generation

```bash
# Generate Cloudflare Workers types
pnpm cf-typegen
```

## Configuration

Edit `wrangler.jsonc` to configure:
- Database binding
- CORS origins
- Environment variables

## Results Format

The `results` field stores JSON data with this structure (subject to change):

```json
{
  "findings": [
    {
      "type": "clause_analysis",
      "severity": "high",
      "description": "Non-standard liability clause detected",
      "clause": "Section 5.2",
      "recommendation": "Review with legal counsel"
    }
  ],
  "highlights": [
    {
      "text": "Company shall be liable for...",
      "severity": "red",
      "reason": "Unlimited liability clause"
    }
  ]
}
```

## TODO

- [ ] Implement Clerk JWT validation in auth middleware
- [ ] Add webhook endpoints for async research updates
- [ ] Implement file upload handling (R2 integration)
- [ ] Add pagination for research list endpoint
- [ ] Implement search/filter capabilities
- [ ] Add research analytics endpoints

## Deployment

```bash
# Deploy to Cloudflare Workers
pnpm deploy
```

Remember to set up the D1 database in your Cloudflare dashboard and update the `database_id` in `wrangler.jsonc`.
