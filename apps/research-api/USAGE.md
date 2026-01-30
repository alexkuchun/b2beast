# API Usage Examples

## Using with Hono RPC Client

The API is built with Hono and can be consumed using the Hono RPC client for type-safe API calls.

### Installation (Client Side)

```bash
npm install hono
```

### Setup RPC Client

```typescript
import { hc } from 'hono/client';
import type { AppType } from 'research-api';

// Create typed client
const client = hc<AppType>('https://your-api.workers.dev', {
  headers: {
    'x-user-id': 'user_clerk_id_here'
  }
});
```

### Example Usage

#### Create Research

```typescript
const response = await client.research.$post({
  json: {
    contractName: 'Vendor Agreement 2024',
    contractUrl: 'https://storage.example.com/contract.pdf'
  }
});

const data = await response.json();
console.log(data.research);
```

#### Get All Research

```typescript
const response = await client.research.$get();
const data = await response.json();
console.log(data.research); // Array of research items
```

#### Get Single Research

```typescript
const researchId = 'abc-123-def';
const response = await client.research[':id'].$get({
  param: { id: researchId }
});

const data = await response.json();
console.log(data.research);
```

#### Update Research

```typescript
const researchId = 'abc-123-def';
const response = await client.research[':id'].$patch({
  param: { id: researchId },
  json: {
    status: 'in_progress',
    currentStage: 'analyzing_clauses'
  }
});

const data = await response.json();
console.log(data.research);
```

#### Update Research Status

```typescript
const researchId = 'abc-123-def';
const response = await client.research[':id'].status.$patch({
  param: { id: researchId },
  json: {
    status: 'completed',
    results: JSON.stringify({
      findings: [
        {
          type: 'clause_analysis',
          severity: 'high',
          description: 'Non-standard liability clause detected',
          clause: 'Section 5.2'
        }
      ],
      highlights: [
        {
          text: 'Company shall be liable for...',
          severity: 'red',
          reason: 'Unlimited liability clause'
        }
      ]
    })
  }
});

const data = await response.json();
console.log(data.research);
```

#### Delete Research

```typescript
const researchId = 'abc-123-def';
const response = await client.research[':id'].$delete({
  param: { id: researchId }
});

const data = await response.json();
console.log(data.success); // true
```

## Direct HTTP Examples

### Using curl

#### Create Research

```bash
curl -X POST https://your-api.workers.dev/research \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_clerk_id_here" \
  -d '{
    "contractName": "Vendor Agreement 2024",
    "contractUrl": "https://storage.example.com/contract.pdf"
  }'
```

#### Get All Research

```bash
curl https://your-api.workers.dev/research \
  -H "x-user-id: user_clerk_id_here"
```

#### Update Research Status

```bash
curl -X PATCH https://your-api.workers.dev/research/abc-123-def/status \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_clerk_id_here" \
  -d '{
    "status": "completed",
    "results": "{\"findings\": [], \"highlights\": []}"
  }'
```

## React Example

```typescript
import { hc } from 'hono/client';
import type { AppType } from 'research-api';
import { useEffect, useState } from 'react';

// Initialize client
const client = hc<AppType>(process.env.NEXT_PUBLIC_API_URL!, {
  headers: {
    'x-user-id': getUserId() // Get from Clerk
  }
});

function ResearchList() {
  const [research, setResearch] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResearch() {
      try {
        const response = await client.research.$get();
        const data = await response.json();
        setResearch(data.research);
      } catch (error) {
        console.error('Failed to fetch research:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchResearch();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <ul>
      {research.map((item) => (
        <li key={item.id}>
          {item.contractName} - {item.status}
        </li>
      ))}
    </ul>
  );
}
```

## Response Types

All responses are type-safe when using the Hono RPC client:

```typescript
// Types are automatically inferred
type ResearchResponse = {
  research: {
    id: string;
    userId: string;
    contractName: string;
    contractUrl: string | null;
    status: string;
    currentStage: string | null;
    results: string | null;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    errorMessage: string | null;
  }
};
```
