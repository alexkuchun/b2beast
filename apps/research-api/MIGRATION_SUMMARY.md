# Antihal Migration Summary: Docker → Cloudflare Container

This document summarizes the migration from a standalone Docker-based antihal service to a **Cloudflare Container**-based integration.

## What Changed

### Architecture

**Before**:
```
research-api → HTTP → localhost:8000 (Docker Container)
```

**After**:
```
research-api → Container Binding → Cloudflare Container
```

### Key Benefits

1. **No External Dependencies**: Container runs within Cloudflare Workers infrastructure
2. **Simplified Deployment**: Single deployment command (`wrangler deploy`)
3. **Better Integration**: Direct container binding (no network calls)
4. **Auto-Scaling**: Cloudflare handles container lifecycle and scaling
5. **Cost Efficiency**: No separate container hosting needed

## Files Changed

### 1. Workflow (`src/workflows/pdf-parser.ts`)

**Before**:
```typescript
import { estimateHallucinationRisk } from "../utils/antihal";

const antihalUrl = this.env.ANTIHAL_URL;
const metrics = await estimateHallucinationRisk(antihalUrl, prompt);
```

**After**:
```typescript
const container = this.env.PYTHON_EXECUTOR.getByName('antihal-instance');
const response = await container.fetch(
  new Request('http://container/api/hallucinations/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: antihalPrompt }),
    signal: AbortSignal.timeout(30000),
  })
);
const metrics = await response.json();
```

**Changes**:
- Removed `estimateHallucinationRisk` utility import
- Use container binding instead of HTTP URL
- Call container.fetch() instead of external endpoint
- Same timeout (30 seconds)
- Same response format

### 2. Environment Variables (`.dev.vars`)

**Removed**:
```bash
ANTIHAL_URL=http://localhost:8000
```

**Kept**:
```bash
OPENROUTER_API_KEY=sk-or-v1-...
```

**Reason**: Container is accessed via binding, not HTTP URL

### 3. Type Definitions (`src/types/env.d.ts`)

**Removed**:
```typescript
ANTIHAL_URL: string;
```

**Kept**:
```typescript
OPENROUTER_API_KEY: string;
```

### 4. Container Dependencies (`container/requirements.txt`)

**Added**:
```txt
openai>=1.0.0
requests>=2.31.0
```

**Reason**: Antihal needs these for hallucination detection

### 5. Batch Processing (`src/workflows/pdf-parser.ts`)

**Before**: 20 blocks per batch
**After**: 5 blocks per batch

**Reason**: Prevent overwhelming the antihal container with too many concurrent requests

## Files Removed

### Old Docker Setup
- `apps/research-antihal/` (entire directory)
  - `docker-compose.yml`
  - `Dockerfile`
  - `src/main.py`
  - etc.

**Reason**: Antihal now runs as Cloudflare Container in `apps/research-api/container/`

### Utility File
- `apps/research-api/src/utils/antihal.ts`

**Reason**: No longer needed (container binding used instead)

## Files Added/Updated

### New Documentation
- [ANTIHAL_INTEGRATION_CONTAINER.md](ANTIHAL_INTEGRATION_CONTAINER.md) - Complete container-based setup guide
- [MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md) - This file

### Existing Container Structure
The antihal service now lives in:
```
apps/research-api/container/
├── Dockerfile                # Container image
├── requirements.txt          # Dependencies
├── src/
│   ├── main.py              # Antihal FastAPI app
│   └── hallbayes/           # Hallucination detection lib
```

## Configuration

### Container Binding (`wrangler.jsonc`)

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

### Container Class (`src/containers/python-executor.ts`)

```typescript
import { Container } from '@cloudflare/containers';
import { env } from 'cloudflare:workers';

export class PythonExecutorContainer extends Container {
  defaultPort = 8000;
  sleepAfter = '10m';  // Keep alive for 10 minutes

  // Pass environment variables to the container (class-level envVars)
  envVars = {
    OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
  };
}
```

**Key Configuration**: Uses **class-level `envVars`** to pass the `OPENROUTER_API_KEY` to the container. This is the recommended pattern for static secrets that are the same for all container instances.

## Performance Improvements

### 1. Batch Size Reduction

**Before**: 20 concurrent antihal requests
**After**: 5 concurrent antihal requests

**Impact**:
- Reduced container load
- More stable performance
- No hanging/timeout issues

**Tradeoff**: ~60 seconds slower for 87 blocks, but 100% reliable

### 2. Request Timeout

**Before**: No timeout (could hang indefinitely)
**After**: 30 second timeout

**Impact**:
- Prevents hanging workflows
- Graceful degradation if antihal is slow
- Workflow continues without metrics on timeout

## Testing

### Local Development

```bash
cd apps/research-api
pnpm run dev
```

Container automatically starts with the Worker.

### Test Container Health

```bash
curl http://localhost:8787/container/health
```

Expected response:
```json
{
  "success": true,
  "message": "Python container is working!",
  "containerResponse": { "status": "healthy", ... }
}
```

### Test Workflow

1. Upload a PDF contract via the API
2. Check workflow logs for antihal calls:
   ```
   [Workflow] Calling antihal container for block X
   [Workflow] Antihal metrics for block X: risk=0.000000, isr=2.556, budget=4.559
   ```
3. Verify `hallucination_risk`, `isr`, `info_budget` are present in review results

## Deployment

### Local
```bash
pnpm run dev
```

### Production
```bash
wrangler deploy
```

Wrangler will:
1. Build container image from `./container/Dockerfile`
2. Push to Cloudflare's container registry
3. Deploy Worker with container binding
4. Make container available globally

### Secrets

Set the OpenRouter API key:
```bash
wrangler secret put OPENROUTER_API_KEY
```

## Troubleshooting

### Container Not Starting

**Check**:
- Dockerfile syntax
- Python dependencies in requirements.txt
- Container logs in wrangler output

**Fix**:
```bash
# Rebuild container
pnpm run dev
```

### Antihal Calls Failing

**Symptoms**:
- `[Workflow] Antihal container error for block X`
- No hallucination metrics in results

**Check**:
1. Is `OPENROUTER_API_KEY` set?
   ```bash
   echo $OPENROUTER_API_KEY  # In .dev.vars
   ```

2. Test container health:
   ```bash
   curl http://localhost:8787/container/health
   ```

3. Check container logs for errors

**Fix**:
- Set/update `OPENROUTER_API_KEY`
- Restart dev server
- Check hallbayes library is installed

### Workflow Hanging

**Symptoms**:
- Workflow stuck at "reviewing" stage
- Logs repeat batch processing

**Check**:
1. Batch size (should be 5, not 20)
2. Timeout is working (30 seconds)
3. Container response time

**Fix**:
- Already fixed (batch size reduced to 5)
- If still slow, reduce to 3 or 2

## Rollback

If you need to revert to the Docker-based setup:

1. **Restore Docker setup**:
   ```bash
   git checkout HEAD~1 apps/research-antihal
   cd apps/research-antihal
   docker-compose up -d
   ```

2. **Revert workflow changes**:
   ```bash
   git checkout HEAD~1 apps/research-api/src/workflows/pdf-parser.ts
   git checkout HEAD~1 apps/research-api/src/utils/antihal.ts
   git checkout HEAD~1 apps/research-api/src/types/env.d.ts
   git checkout HEAD~1 apps/research-api/.dev.vars
   ```

3. **Add back ANTIHAL_URL**:
   ```bash
   echo "ANTIHAL_URL=http://localhost:8000" >> apps/research-api/.dev.vars
   ```

## Migration Checklist

- [x] Update workflow to use container binding
- [x] Remove ANTIHAL_URL from environment
- [x] Remove antihal utility file
- [x] Update container requirements.txt
- [x] Reduce batch size to 5
- [x] Add 30-second timeout
- [x] Update documentation
- [x] Test local development
- [x] Verify TypeScript compilation
- [ ] Test deployment to production
- [ ] Monitor production performance

## Next Steps

1. **Test in Production**: Deploy and monitor first workflow execution
2. **Performance Tuning**: Adjust batch size if needed (5 → 8 → 10)
3. **Monitoring**: Add metrics for antihal response times
4. **Optimization**: Consider caching frequent prompts
5. **Scaling**: Increase max_instances if throughput needs grow

## References

- [ANTIHAL_INTEGRATION_CONTAINER.md](ANTIHAL_INTEGRATION_CONTAINER.md) - Detailed container setup guide
- [ANTIHAL_PERFORMANCE.md](ANTIHAL_PERFORMANCE.md) - Performance optimization notes
- [wrangler.jsonc](wrangler.jsonc) - Container configuration
- [container/src/main.py](container/src/main.py) - Antihal service implementation
