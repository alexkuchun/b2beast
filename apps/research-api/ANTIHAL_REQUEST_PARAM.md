# Antihal API Key - Request Parameter Approach

This document explains the final implementation for passing the `OPENROUTER_API_KEY` to the antihal container.

## Approach

Instead of using environment variables (which didn't work with Cloudflare Containers), we pass the API key **as a request parameter** in the body of each request to the antihal service.

## Implementation

### 1. Workflow Side (Caller)

**File**: [src/workflows/pdf-parser.ts](src/workflows/pdf-parser.ts)

```typescript
// Call the container's hallucination estimation endpoint with API key in request body
const response = await container.fetch(
  new Request('http://container/api/hallucinations/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: antihalPrompt,
      api_key: this.env.OPENROUTER_API_KEY  // Pass API key in request body
    }),
    signal: AbortSignal.timeout(30000),
  })
);
```

### 2. Container Side (Receiver)

**File**: [container/src/main.py](container/src/main.py)

```python
class ResearchQuery(BaseModel):
    prompt: str
    api_key: str  # API key passed in request body

@app.post("/api/hallucinations/estimate")
async def estimate_hallucinations(body: ResearchQuery):
    # Get API key from request body
    api_key = body.api_key
    if not api_key:
        raise HTTPException(status_code=400, detail="api_key is required in request body")

    # Use the API key
    backend = OpenRouterBackend(
        model="google/gemini-2.5-flash-lite",
        api_key=api_key
    )
    # ... rest of the code
```

## Why This Approach?

### Attempted: Environment Variables (❌ Didn't Work)

We tried:
1. **Class-level `envVars`**: Didn't pass to container
2. **Per-instance `envVars`**: Didn't work either
3. **Docker-style environment**: Not available in Cloudflare Containers

### Final: Request Parameters (✅ Works)

**Advantages**:
- ✅ Simple and straightforward
- ✅ Works reliably with Cloudflare Containers
- ✅ No environment variable issues
- ✅ Easy to debug (visible in request body)
- ✅ Explicit (clear what's being passed)

**Trade-offs**:
- API key sent in every request (minimal overhead)
- Slightly larger request body (negligible)

## Flow Diagram

```
┌────────────────────────────────────────────────┐
│ Cloudflare Worker Environment                  │
│                                                 │
│ env.OPENROUTER_API_KEY = "sk-or-v1-..."       │
└────────────────┬───────────────────────────────┘
                 │
                 │ Included in request body
                 ▼
┌────────────────────────────────────────────────┐
│ Workflow (pdf-parser.ts)                       │
│                                                 │
│ body: {                                        │
│   prompt: "...",                               │
│   api_key: this.env.OPENROUTER_API_KEY        │
│ }                                              │
└────────────────┬───────────────────────────────┘
                 │
                 │ container.fetch()
                 ▼
┌────────────────────────────────────────────────┐
│ Antihal Container (main.py)                    │
│                                                 │
│ api_key = body.api_key                         │
│ backend = OpenRouterBackend(api_key=api_key)  │
└────────────────────────────────────────────────┘
```

## Configuration

### Local Development

Set in `.dev.vars`:

```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

### Production

Set in Cloudflare Secrets:

```bash
wrangler secret put OPENROUTER_API_KEY
```

## Request Format

### Request

```json
POST http://container/api/hallucinations/estimate

{
  "prompt": "Analyze this legal contract clause...",
  "api_key": "sk-or-v1-..."
}
```

### Response

```json
{
  "hallucination_risk": 0.05,
  "isr": 1.23,
  "info_budget": 0.45
}
```

## Security Considerations

1. **API Key in Request Body**: The key is passed in the request body, not as a query parameter or header
2. **Internal Communication**: Communication is within the Cloudflare Workers environment (container binding, not external HTTP)
3. **Not Logged**: Request bodies are not logged by default in production
4. **HTTPS**: All Cloudflare Workers communication is encrypted

## Testing

### Test with curl (if running locally)

Not applicable - the container is accessed via Cloudflare binding, not direct HTTP.

### Test via Workflow

Upload a PDF and check logs:

```
[Workflow] Calling antihal container for block 0 hallucination assessment
[Workflow] Antihal metrics for block 0: risk=0.000000, isr=2.556, budget=4.559
```

## Troubleshooting

### Error: `api_key is required in request body`

**Cause**: The API key is not being passed or is empty.

**Fix**:
1. Check `.dev.vars` has `OPENROUTER_API_KEY`
2. Verify workflow is passing `api_key: this.env.OPENROUTER_API_KEY`
3. Restart dev server

### Error: `Invalid API key`

**Cause**: Wrong or expired API key.

**Fix**:
1. Get a new key from OpenRouter
2. Update `.dev.vars` and production secrets
3. Test with a simple request

### Container Not Responding

**Cause**: Container might not be starting.

**Fix**:
1. Check container logs in wrangler output
2. Verify Dockerfile builds correctly
3. Check Python dependencies are installed

## Comparison: Old vs New

### Old Approach (Docker)

```bash
# Docker container with environment variable
docker run -e OPENROUTER_API_KEY=sk-or-v1-... antihal

# In Python
api_key = os.getenv("OPENROUTER_API_KEY")
```

### New Approach (Cloudflare Container)

```typescript
// Pass in request body
const response = await container.fetch(
  new Request('http://container/api/hallucinations/estimate', {
    body: JSON.stringify({
      prompt: "...",
      api_key: env.OPENROUTER_API_KEY
    })
  })
);
```

```python
# In Python - receive from request body
api_key = body.api_key
```

## Benefits

1. **Reliability**: Works consistently with Cloudflare Containers
2. **Simplicity**: No complex environment variable passing
3. **Debugging**: Easy to see what's being sent
4. **Flexibility**: Can pass different keys per request if needed
5. **No Container Restart**: Changes to API key don't require container rebuild

## Related Files

- Workflow: [src/workflows/pdf-parser.ts](src/workflows/pdf-parser.ts)
- Antihal Service: [container/src/main.py](container/src/main.py)
- Container Class: [src/containers/python-executor.ts](src/containers/python-executor.ts)
- Environment Config: [.dev.vars](.dev.vars)
