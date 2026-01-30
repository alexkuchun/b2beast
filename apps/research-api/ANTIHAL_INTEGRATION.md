# Antihal Integration

This document describes how the research-api integrates with the research-antihal service for hallucination detection.

## Overview

The research-api uses the dockerized research-antihal service to evaluate LLM responses for hallucination risk during contract review. When the PDF parser workflow reviews contract blocks, it also sends the content to antihal to get hallucination risk metrics.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  research-api   │────────▶│ research-antihal │
│  (Cloudflare)   │  HTTP   │    (Docker)      │
│                 │◀────────│                  │
└─────────────────┘         └──────────────────┘
     Workflow                   Port 8000
```

## Setup

### 1. Environment Variables

The following environment variables must be configured in `.dev.vars` for local development:

```bash
# Antihal Service URL (Docker container on localhost)
ANTIHAL_URL=http://localhost:8000

# OpenRouter API Key (used by antihal for LLM access)
OPENROUTER_API_KEY=your-openrouter-key-here
```

For production, these should be set in Cloudflare Workers secrets:

```bash
wrangler secret put ANTIHAL_URL
wrangler secret put OPENROUTER_API_KEY
```

### 2. Running the Antihal Service

The antihal service runs in a Docker container:

```bash
cd apps/research-antihal
docker-compose up -d
```

Verify it's running:
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","service":"research-antihal"}
```

### 3. Testing the Integration

Test the antihal API directly:
```bash
curl -X POST http://localhost:8000/api/hallucinations/estimate \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Your test prompt here"}'
```

Expected response:
```json
{
  "hallucination_risk": 0.05,
  "isr": 1.23,
  "info_budget": 0.45
}
```

## How It Works

### Workflow Integration

When the PDF parser workflow reviews contract blocks, it:

1. **Parses the PDF** - Extracts paragraphs/sections from each page
2. **Reviews each block** - Uses OpenRouter LLM to analyze for legal risks
3. **Calls Antihal** - Sends the block content + assessment to antihal for hallucination detection
4. **Stores metrics** - Saves the hallucination risk, ISR, and info budget with the review

### Code Flow

1. **Workflow calls `reviewBlock()`** - [pdf-parser.ts:420](src/workflows/pdf-parser.ts#L420)
2. **Gets LLM risk assessment** - Uses OpenRouter to analyze legal risks
3. **Calls `estimateHallucinationRisk()`** - [pdf-parser.ts:537](src/workflows/pdf-parser.ts#L537)
4. **Antihal client makes HTTP request** - [antihal.ts:29](src/utils/antihal.ts#L29)
5. **Returns metrics** - Includes hallucination_risk, isr, info_budget in review

### Data Structure

The `ContractBlockReview` type includes antihal metrics:

```typescript
export type ContractBlockReview = {
  blockIndex: number;
  severity: "safe" | "medium" | "elevated" | "high";
  start: number;
  end: number;
  comment: string;
  hallucination_risk?: number;  // From antihal
  isr?: number;                 // From antihal
  info_budget?: number;         // From antihal
};
```

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

- **Antihal unavailable**: Reviews continue without hallucination metrics
- **Network errors**: Logged but don't fail the workflow
- **Invalid responses**: Caught and logged, workflow continues

Check workflow logs for antihal-related errors:
```
[Workflow] Antihal service error for block X: ...
```

## Production Considerations

### Cloudflare Workers Limitations

1. **Network Access**: Cloudflare Workers can make outbound HTTP requests, but the antihal service must be publicly accessible
2. **Timeout**: Worker requests have a maximum timeout (typically 30-60 seconds)
3. **Cold Starts**: First request may be slower due to container startup

### Recommended Production Setup

For production, consider:

1. **Deploy antihal as a service** - Use Cloudflare Workers, AWS Lambda, or dedicated server
2. **Use private networking** - VPC peering or private endpoints if possible
3. **Add retry logic** - Implement exponential backoff for transient failures
4. **Monitor health** - Regular health checks and alerting
5. **Scale appropriately** - Multiple antihal instances for high throughput

### Alternative: Local Development Only

If you only want antihal for local development:

1. Keep `ANTIHAL_URL` unset in production
2. The workflow will skip hallucination detection gracefully
3. Reviews will complete without the additional metrics

## Troubleshooting

### Antihal container not starting
```bash
cd apps/research-antihal
docker-compose logs api
```

### Connection refused
- Verify antihal is running: `docker ps | grep antihal`
- Check port mapping: Should see `0.0.0.0:8000->8000/tcp`
- Test health endpoint: `curl http://localhost:8000/health`

### Missing OPENROUTER_API_KEY
Check the antihal container environment:
```bash
docker inspect research-antihal-api | grep OPENROUTER
```

### Workflow not calling antihal
- Check `ANTIHAL_URL` is set in `.dev.vars`
- Look for warning in logs: `ANTIHAL_URL not configured`
- Verify environment variables are loaded: Check wrangler output on startup

## Development

### Running Tests
```bash
# Test antihal service
curl -X POST http://localhost:8000/api/hallucinations/estimate \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Test prompt"}'

# Run research-api locally
cd apps/research-api
pnpm run dev
```

### Debugging
Enable verbose logging in the workflow:
- Check `[Workflow]` prefixed console logs
- Look for antihal-specific messages
- Use `wrangler tail` to see live logs

## References

- Antihal Service: [apps/research-antihal/src/main.py](../research-antihal/src/main.py)
- Antihal Client: [src/utils/antihal.ts](src/utils/antihal.ts)
- Workflow Integration: [src/workflows/pdf-parser.ts](src/workflows/pdf-parser.ts)
- Type Definitions: [src/types/types.ts](src/types/types.ts)
