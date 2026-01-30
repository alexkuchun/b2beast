# Development Guide

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Cloudflare account (for deployment)

### Initial Setup

1. Install dependencies:
```bash
pnpm install
```

2. Create a local D1 database:
```bash
# This will be created automatically when you run migrations
wrangler d1 create research-api-db
```

3. Copy the database ID from the output and update `wrangler.jsonc`:
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "research-api-db",
      "database_id": "YOUR_DATABASE_ID_HERE"
    }
  ]
}
```

4. Run database migrations:
```bash
pnpm db:migrate:local
```

5. Set up environment secrets:
```bash
# Copy the example file
cp .dev.vars.example .dev.vars

# Edit .dev.vars and add your OpenAI API key
# OPENAI_API_KEY=sk-your-actual-key-here
```

6. Start the development server:
```bash
pnpm dev
```

The API will be available at `http://localhost:8787`

## Testing the API

### Using curl

```bash
# Health check
curl http://localhost:8787/health

# Create research (need to provide x-user-id header)
curl -X POST http://localhost:8787/research \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-123" \
  -d '{
    "contractName": "Test Contract",
    "contractUrl": "https://example.com/contract.pdf"
  }'

# List research
curl http://localhost:8787/research \
  -H "x-user-id: test-user-123"
```

### Using a REST client

Import the following into Postman/Insomnia:

**Environment Variables:**
- `BASE_URL`: `http://localhost:8787`
- `USER_ID`: `test-user-123`

**Headers (for all requests):**
- `x-user-id`: `{{USER_ID}}`

## Database Changes

When you modify the schema in `src/db/schema.ts`:

1. Generate new migration:
```bash
pnpm db:generate
```

2. Review the generated SQL in `migrations/`

3. Apply migration:
```bash
# Local
pnpm db:migrate:local

# Production
pnpm db:migrate:remote
```

## Project Structure

```
research-api/
├── src/
│   ├── db/
│   │   ├── schema.ts        # Database schema
│   │   └── index.ts         # Database connection
│   ├── middleware/
│   │   └── auth.ts          # Auth middleware
│   ├── routes/
│   │   └── research.ts      # Research endpoints
│   ├── types/
│   │   └── bindings.d.ts    # TypeScript types
│   └── index.ts             # Main app entry point
├── migrations/              # Database migrations
├── wrangler.jsonc          # Cloudflare Workers config
├── package.json
├── tsconfig.json
└── drizzle.config.ts       # Drizzle ORM config
```

## Adding New Endpoints

1. Create a new route file in `src/routes/`
2. Define your Hono app with typed context
3. Import and mount in `src/index.ts`

Example:

```typescript
// src/routes/analysis.ts
import { Hono } from 'hono';
import type { DrizzleDb } from '../db';

type AppType = {
  Bindings: ResearchApiCloudflareBindings;
  Variables: {
    db: DrizzleDb;
    userId: string | null;
  };
};

export const analysisRoutes = new Hono<AppType>()
  .get('/', async (c) => {
    return c.json({ message: 'Analysis endpoint' });
  });
```

```typescript
// src/index.ts
import { analysisRoutes } from './routes/analysis';

const app = new Hono()
  // ... existing middleware
  .route('/analysis', analysisRoutes);
```

## Debugging

### View Local Database

```bash
# Open D1 console
wrangler d1 execute research-api-db --local --command "SELECT * FROM research"

# Or use sqlite3 directly
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/...db
```

### Check Logs

Development server logs appear in your terminal. In production:

```bash
wrangler tail
```

## Clerk Integration (TODO)

To integrate Clerk authentication:

1. Update `src/middleware/auth.ts`:

```typescript
import { createClerkClient } from '@clerk/backend';

export async function authMiddleware(c, next) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    c.set('userId', null);
    return next();
  }

  try {
    const clerk = createClerkClient({
      secretKey: c.env.CLERK_SECRET_KEY
    });

    const session = await clerk.sessions.verifySession(token);
    c.set('userId', session.userId);
  } catch (error) {
    c.set('userId', null);
  }

  await next();
}
```

2. Add Clerk secret to wrangler.jsonc:

```jsonc
{
  "vars": {
    "CLERK_SECRET_KEY": "your-secret-key"
  }
}
```

## Deployment

### First Time Setup

1. Create production D1 database:
```bash
wrangler d1 create research-api-db
```

2. Update `wrangler.jsonc` with production database ID

3. Run production migrations:
```bash
pnpm db:migrate:remote
```

### Set Production Secrets

```bash
# Set OpenAI API key for production
wrangler secret put OPENAI_API_KEY
# Enter your production API key when prompted
```

### Deploy

```bash
pnpm deploy
```

Your API will be available at: `https://research-api.YOUR_SUBDOMAIN.workers.dev`

## Common Issues

### "DB not found" error
- Make sure you've created the D1 database and updated `database_id` in `wrangler.jsonc`
- Run migrations: `pnpm db:migrate:local`

### CORS errors
- Update `CORS_ORIGINS` in `wrangler.jsonc` to include your frontend URL

### Type errors
- Run `pnpm cf-typegen` to regenerate Cloudflare Workers types

## Next Steps

- [ ] Implement Clerk JWT validation
- [ ] Add file upload support (R2)
- [ ] Implement webhook endpoints for async updates
- [ ] Add rate limiting
- [ ] Set up monitoring and alerts
- [ ] Add comprehensive tests
