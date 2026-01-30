# Container Environment Variables Configuration

This document explains how environment variables are passed to the Cloudflare Container running the antihal service.

## Overview

The antihal container needs the `OPENROUTER_API_KEY` to make LLM API calls for hallucination detection. This key is passed from the Cloudflare Worker environment to the container using **class-level `envVars`**.

## Implementation

### Container Class Definition

**File**: [src/containers/python-executor.ts](src/containers/python-executor.ts)

```typescript
import { Container } from '@cloudflare/containers';
import { env } from 'cloudflare:workers';

export class PythonExecutorContainer extends Container {
  // Port that the FastAPI server listens on
  defaultPort = 8000;

  // How long to keep the container alive after the last request
  sleepAfter = '10m';

  // Pass environment variables to the container
  envVars = {
    OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
  };
}
```

## Why Class-Level `envVars`?

Cloudflare Containers support two ways to pass environment variables:

### Option 1: Class-Level `envVars` (✅ Used)

**Best for**: Static secrets that are the same for all container instances

```typescript
export class PythonExecutorContainer extends Container {
  envVars = {
    OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
  };
}
```

**Advantages**:
- ✅ Simple and concise
- ✅ Set once in the class definition
- ✅ Automatically applied to all container instances
- ✅ Recommended for static secrets

### Option 2: Per-Instance `envVars` (❌ Not Used)

**Best for**: Dynamic values that differ per instance

```typescript
const container = env.PYTHON_EXECUTOR.getByName('instance-name');
const response = await container.fetch(request, {
  envVars: {
    INSTANCE_ID: 'unique-id-123',
    FEATURE_FLAG: getFeatureFlag(),
  }
});
```

**When to use**:
- Dynamic runtime configuration
- Instance-specific settings
- Values from KV, Durable Objects, etc.
- Feature flags per request

## Our Use Case

We use **class-level `envVars`** because:

1. **Static Secret**: The `OPENROUTER_API_KEY` is the same for all container instances
2. **No Dynamic Values**: We don't need different keys per instance
3. **Simplicity**: Set once, works everywhere
4. **Best Practice**: Recommended pattern by Cloudflare

## Flow Diagram

```
┌─────────────────────────────────────────────────┐
│ .dev.vars / Cloudflare Secrets                  │
│                                                  │
│ OPENROUTER_API_KEY=sk-or-v1-...                │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ Cloudflare Worker Environment (env)             │
│                                                  │
│ env.OPENROUTER_API_KEY                          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ PythonExecutorContainer Class                   │
│                                                  │
│ envVars = {                                     │
│   OPENROUTER_API_KEY: env.OPENROUTER_API_KEY   │
│ }                                               │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ Container Instance (Python)                     │
│                                                  │
│ os.getenv("OPENROUTER_API_KEY")                │
│ → sk-or-v1-...                                  │
└─────────────────────────────────────────────────┘
```

## Configuration Steps

### 1. Set the Secret Locally

Add to `.dev.vars`:

```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

### 2. Set the Secret in Production

```bash
wrangler secret put OPENROUTER_API_KEY
# Paste your key when prompted
```

### 3. Define `envVars` in Container Class

Already done in [src/containers/python-executor.ts](src/containers/python-executor.ts):

```typescript
envVars = {
  OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
};
```

### 4. Access in Python Container

The antihal service accesses it in [container/src/main.py](container/src/main.py):

```python
import os

api_key = os.getenv("OPENROUTER_API_KEY")
if not api_key:
    raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")
```

## Troubleshooting

### Error: `OPENROUTER_API_KEY not configured`

**Cause**: The environment variable is not being passed to the container.

**Solutions**:

1. **Check `.dev.vars` exists and has the key**:
   ```bash
   cat apps/research-api/.dev.vars | grep OPENROUTER
   ```

2. **Verify Container Class has `envVars`**:
   ```bash
   cat apps/research-api/src/containers/python-executor.ts | grep -A 3 envVars
   ```

   Should see:
   ```typescript
   envVars = {
     OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
   };
   ```

3. **Restart dev server**:
   ```bash
   # Stop the current dev server (Ctrl+C)
   pnpm run dev
   ```

4. **Check container logs** for environment variable:
   ```bash
   # In wrangler dev output, look for container startup logs
   ```

### Error: `env is not defined`

**Cause**: Missing import statement.

**Solution**: Add import at the top of `python-executor.ts`:

```typescript
import { env } from 'cloudflare:workers';
```

### Key Not Reaching Container

**Debug Steps**:

1. **Add debug logging to Container class**:
   ```typescript
   envVars = {
     OPENROUTER_API_KEY: (() => {
       console.log('Passing OPENROUTER_API_KEY to container:', env.OPENROUTER_API_KEY?.substring(0, 10) + '...');
       return env.OPENROUTER_API_KEY;
     })(),
   };
   ```

2. **Add debug logging in Python**:
   ```python
   api_key = os.getenv("OPENROUTER_API_KEY")
   print(f"OPENROUTER_API_KEY present: {bool(api_key)}")
   print(f"OPENROUTER_API_KEY starts with: {api_key[:10] if api_key else 'None'}")
   ```

3. **Check wrangler output** for the debug logs

## Adding More Environment Variables

If you need to pass additional environment variables:

```typescript
envVars = {
  OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
  OPENAI_API_KEY: env.OPENAI_API_KEY,        // Add more secrets
  DEBUG_MODE: 'true',                         // Static values
  ENVIRONMENT: env.ENVIRONMENT || 'dev',      // With fallback
};
```

**Important**: All environment variables must be defined in:
1. `.dev.vars` (local development)
2. Cloudflare Secrets (production)
3. TypeScript types in `env.d.ts`

## Best Practices

1. **Use class-level `envVars` for static secrets**: ✅
2. **Never hardcode secrets in code**: ❌
3. **Always check if env var exists before using**: ✅
   ```python
   if not os.getenv("OPENROUTER_API_KEY"):
       raise Exception("Missing OPENROUTER_API_KEY")
   ```
4. **Use fallback values for non-sensitive config**: ✅
   ```typescript
   DEBUG_MODE: env.DEBUG_MODE || 'false'
   ```
5. **Add type definitions**: ✅
   ```typescript
   interface ResearchApiCloudflareBindings {
     OPENROUTER_API_KEY: string;
   }
   ```

## References

- Cloudflare Containers Docs: https://developers.cloudflare.com/workers/runtime-apis/containers/
- Container Class: [src/containers/python-executor.ts](src/containers/python-executor.ts)
- Antihal Service: [container/src/main.py](container/src/main.py)
- Environment Types: [src/types/env.d.ts](src/types/env.d.ts)
