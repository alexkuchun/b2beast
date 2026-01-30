# Antihal Integration (Cloudflare Container)

This document describes how the research-api integrates with the antihal service for hallucination detection using **Cloudflare Containers**.

## Overview

The research-api uses a **Cloudflare Container**-based antihal service to evaluate LLM responses for hallucination risk during contract review. When the PDF parser workflow reviews contract blocks, it calls the antihal container to get hallucination risk metrics.

## Architecture

```
┌─────────────────────────────────────────┐
│         Cloudflare Workers              │
│                                         │
│  ┌───────────┐      ┌──────────────┐   │
│  │ Workflow  │─────▶│   Antihal    │   │
│  │           │      │  Container   │   │
│  │ (pdf-     │◀─────│  (Python)    │   │
│  │  parser)  │      └──────────────┘   │
│  └───────────┘                          │
└─────────────────────────────────────────┘
     Container Binding (PYTHON_EXECUTOR)
```

## Key Changes from Previous Setup

### Before (Docker-based)
- Antihal ran in separate Docker container
- API called external HTTP endpoint at `localhost:8000`
- Required `ANTIHAL_URL` environment variable
- Network connectivity between services needed

### After (Container-based)
- Antihal runs as **Cloudflare Container**
- API calls container via binding (no network request)
- No `ANTIHAL_URL` needed
- Built-in integration with Cloudflare Workers

## Setup

### 1. Environment Variables

Only one environment variable is needed in `.dev.vars`:

```bash
# OpenRouter API Key (used by antihal container for LLM access)
OPENROUTER_API_KEY=your-openrouter-key-here
```

For production, set this in Cloudflare Workers secrets:

```bash
wrangler secret put OPENROUTER_API_KEY
```

### 2. Container Configuration

The antihal service is configured in [wrangler.jsonc](wrangler.jsonc):

```json
{
  "containers": [
    {
      "name": "python-executor",
      "class_name": "PythonExecutorContainer",
      "image": "./container/Dockerfile",
      "max_instances": 10
    }
  ],
  "durable_objects": {
    "bindings": [
      {
        "class_name": "PythonExecutorContainer",
        "name": "PYTHON_EXECUTOR"
      }
    ]
  }
}
```

### 3. Container Structure

```
apps/research-api/container/
├── Dockerfile                    # Container image definition
├── requirements.txt              # Python dependencies (FastAPI, OpenAI, etc.)
├── src/
│   ├── main.py                  # Antihal FastAPI app
│   └── hallbayes/               # Hallucination detection library
│       ├── hallucination_toolkit.py
│       └── htk_backends.py
└── ...
```

### 5. Local Development

Start the development server:

```bash
cd apps/research-api
pnpm run dev
```

Wrangler will automatically:
1. Build the container image from `./container/Dockerfile`
2. Start the container with the FastAPI antihal service
3. Pass `OPENROUTER_API_KEY` from `.dev.vars` to the container via `envVars`
4. Make it available via the `PYTHON_EXECUTOR` binding

## How It Works

### Workflow Integration

When the PDF parser workflow reviews contract blocks:

1. **Get Container Instance**
   ```typescript
   const container = this.env.PYTHON_EXECUTOR.getByName('antihal-instance');
   ```

2. **Call Antihal Endpoint**
   ```typescript
   const response = await container.fetch(
     new Request('http://container/api/hallucinations/estimate', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ prompt: antihalPrompt }),
       signal: AbortSignal.timeout(30000), // 30 second timeout
     })
   );
   ```

3. **Process Response**
   ```typescript
   const metrics = await response.json();
   // { hallucination_risk, isr, info_budget }
   ```

### Code Flow

1. **Workflow calls `reviewBlock()`** - [pdf-parser.ts:420](src/workflows/pdf-parser.ts#L420)
2. **Gets LLM risk assessment** - Uses OpenRouter to analyze legal risks
3. **Calls antihal container** - [pdf-parser.ts:539](src/workflows/pdf-parser.ts#L539)
4. **Container processes request** - [container/src/main.py:47](container/src/main.py#L47)
5. **Returns metrics** - Includes hallucination_risk, isr, info_budget in review

### Antihal Container Endpoints

The container exposes these endpoints:

- `GET /health` - Health check
- `POST /api/hallucinations/estimate` - Estimate hallucination risk
- `GET /api/status` - Service status

## Performance Optimizations

### Batch Size Reduction

To avoid overwhelming the antihal container, blocks are processed in **batches of 5** (reduced from 20):

```typescript
// Split blocks into batches of 5 for concurrent processing
const batches = this.chunkArray(allBlocks, 5);
```

This ensures:
- Maximum 5 concurrent antihal requests
- Container remains responsive
- No connection pooling issues
- Stable, predictable performance

### Request Timeout

Each antihal request has a **30-second timeout**:

```typescript
signal: AbortSignal.timeout(30000)
```

Benefits:
- Prevents hanging requests
- Workflow continues if antihal is slow
- Graceful degradation (continues without metrics)

## Container Lifecycle

### Startup
- Container starts automatically when first accessed
- Takes ~5-10 seconds for first request (cold start)
- Subsequent requests are fast (warm container)

### Keep-Alive
The container stays alive for **10 minutes** after the last request:

```typescript
export class PythonExecutorContainer extends Container {
  sleepAfter = '10m';
}
```

### Scaling
- Maximum 10 container instances (configurable)
- Cloudflare automatically scales based on demand
- Each instance handles its own requests independently

## Antihal Metrics

### Hallucination Risk
- **Range**: 0.0 to 1.0 (lower is better)
- **Meaning**: Probability that the LLM's assessment contains hallucinated information
- **Interpretation**:
  - < 0.05: Low risk (generally reliable)
  - 0.05-0.20: Moderate risk (use caution)
  - > 0.20: High risk (verify claims)

### ISR (Information Sufficiency Ratio)
- **Range**: Typically 0.0 to 3.0+
- **Meaning**: Ratio of available information to required information
- **Interpretation**:
  - < 1.0: Insufficient information (higher hallucination risk)
  - ≥ 1.0: Sufficient information (lower hallucination risk)

### Info Budget
- **Range**: Varies (in nats)
- **Meaning**: Information-theoretic budget for the response
- **Interpretation**: Higher values indicate more information used in the assessment

## Error Handling

The integration is designed to be fault-tolerant:

```typescript
try {
  // Call antihal container
  const metrics = await container.fetch(...);
  hallucinationMetrics = { ... };
} catch (antihalError) {
  console.error(`[Workflow] Antihal container error:`, antihalError);
  // Continue without hallucination metrics
}
```

**Behavior**:
- Container unavailable → Reviews continue without metrics
- Timeout → Logged but workflow continues
- Invalid responses → Caught and logged, workflow continues

Check workflow logs:
```
[Workflow] Antihal container error for block X: ...
```

## Testing

### Test Container Health

Via the container routes:

```bash
curl http://localhost:8787/container/health
```

### Test Antihal Endpoint

```bash
curl -X POST http://localhost:8787/container/execute \
  -H 'Content-Type: application/json' \
  -d '{
    "code": "import requests; r = requests.post(\"http://localhost:8000/api/hallucinations/estimate\", json={\"prompt\": \"Test\"}); print(r.json())"
  }'
```

### Monitor Container Logs

When running locally with `wrangler dev`, container logs appear in the console.

## Deployment

### Production Deployment

Deploy to Cloudflare Workers:

```bash
cd apps/research-api
wrangler deploy
```

Wrangler will:
1. Build the container image
2. Push it to Cloudflare's registry
3. Deploy the Worker with container binding
4. Make the container available globally

### Environment Variables

Set production secrets:

```bash
wrangler secret put OPENROUTER_API_KEY
# Enter your OpenRouter API key when prompted
```

## Troubleshooting

### Container Not Starting
- Check Dockerfile syntax
- Verify all dependencies in requirements.txt
- Check container logs in wrangler output

### Antihal Requests Failing
- Verify `OPENROUTER_API_KEY` is set
- Check container health endpoint
- Look for timeout errors (increase timeout if needed)

### Performance Issues
- Reduce batch size further (try 3 or 2)
- Increase `max_instances` in wrangler.jsonc
- Monitor container startup times (cold starts)

### Workflow Hanging
- Check for batch processing getting stuck
- Verify timeout is working (30 seconds)
- Look for error logs in antihal container

## Migration from Docker Setup

If migrating from the old Docker-based setup:

1. **Remove Docker container**:
   ```bash
   docker-compose down
   rm -rf apps/research-antihal
   ```

2. **Update environment**:
   - Remove `ANTIHAL_URL` from `.dev.vars`
   - Keep `OPENROUTER_API_KEY`

3. **Update code**:
   - Already done in pdf-parser.ts
   - Uses `PYTHON_EXECUTOR` binding instead of HTTP URL

4. **Test**:
   - Run `pnpm run dev`
   - Upload a test PDF
   - Verify antihal metrics appear in reviews

## Related Files

- Container Dockerfile: [container/Dockerfile](container/Dockerfile)
- Antihal Service: [container/src/main.py](container/src/main.py)
- Container Class: [src/containers/python-executor.ts](src/containers/python-executor.ts)
- Workflow Integration: [src/workflows/pdf-parser.ts](src/workflows/pdf-parser.ts)
- Configuration: [wrangler.jsonc](wrangler.jsonc)
- Type Definitions: [src/types/types.ts](src/types/types.ts)
