# Cloudflare Container Scaling Configuration

## Overview
This document explains how the antihal Python container is configured to handle multiple concurrent requests across multiple container instances.

## Current Configuration

### Max Instances
- **Location**: `apps/research-api/wrangler.jsonc:42`
- **Setting**: `"max_instances": 10`
- **Purpose**: Maximum number of simultaneously running container instances

### Instance Type
- **Location**: `apps/research-api/wrangler.jsonc:43`
- **Setting**: `"instance_type": "standard-2"`
- **Specifications**:
  - **vCPU**: 1 full vCPU
  - **Memory**: 6 GiB
  - **Disk**: 12 GB
- **Purpose**: Provides dedicated CPU for faster processing

### Load Balancing
- **Implementation**: Using `getRandom()` helper from `@cloudflare/containers`
- **Location**: `apps/research-api/src/workflows/pdf-parser.ts:548`
- **Configuration**: Load balances across 10 container instances

### Concurrency Settings
- **Per Container**: ~5 concurrent requests (4 uvicorn workers)
- **Total Capacity**: 10 containers × 5 requests = ~50 concurrent requests
- **Sleep After**: 15 minutes of inactivity (configured in `PythonExecutorContainer`)

## How It Works

### Load Balancing Strategy
The workflow uses Cloudflare's `getRandom()` helper function to randomly distribute requests across container instances:

```typescript
const container = await getRandom(this.env.PYTHON_EXECUTOR, 8);
```

This ensures that each hallucination check request is routed to one of 8 available container instances, preventing any single container from being overwhelmed.

### Request Flow
1. Workflow receives multiple blocks to review in parallel (batches of 5)
2. Each block's hallucination check calls `getRandom()`
3. `getRandom()` selects one of 8 container instances randomly
4. The selected container processes the request
5. Container stays alive for 15 minutes after last request

### Benefits
- **Scalability**: Can handle up to ~40 concurrent hallucination checks
- **Redundancy**: Multiple containers provide fault tolerance
- **Cost Optimization**: Containers sleep after inactivity
- **Performance**: Parallel processing across multiple instances

## Configuration Parameters

### wrangler.jsonc
```json
{
  "containers": [
    {
      "name": "python-executor",
      "class_name": "PythonExecutorContainer",
      "image": "./container/Dockerfile",
      "max_instances": 10,      // Maximum concurrent containers
      "instance_type": "standard-2"  // 1 vCPU, 6 GiB memory, 12 GB disk
    }
  ]
}
```

### Available Instance Types
| Type | vCPU | Memory | Disk | Best For |
|------|------|--------|------|----------|
| lite | 1/16 | 256 MiB | 2 GB | Very light workloads |
| basic | 1/4 | 1 GiB | 4 GB | Light workloads |
| standard-1 | 1/2 | 4 GiB | 8 GB | Medium workloads |
| **standard-2** ⭐ | **1** | **6 GiB** | **12 GB** | **AI/ML processing (current)** |
| standard-3 | 2 | 8 GiB | 16 GB | Heavy workloads |
| standard-4 | 4 | 12 GiB | 20 GB | Very heavy workloads |

### PythonExecutorContainer
```typescript
export class PythonExecutorContainer extends Container {
  defaultPort = 8000;           // FastAPI server port
  sleepAfter = '15m';          // Keep warm for 15 minutes
}
```

### Workflow Load Balancing
```typescript
// Load balance across 10 instances
const container = await getRandom(this.env.PYTHON_EXECUTOR, 10);
```

### FastAPI Workers (Dockerfile)
```dockerfile
# 4 uvicorn workers for handling concurrent requests
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

## Adjusting Concurrency

### To handle MORE concurrent requests:

**Option 1: Add more containers (recommended for horizontal scaling)**
1. Increase `max_instances` in wrangler.jsonc (e.g., to 15 or 20)
2. Update `getRandom()` in pdf-parser.ts to match the new max
3. Each additional container adds ~5 concurrent request capacity

**Option 2: Upgrade instance type (recommended for CPU-intensive workloads)**
1. Change `instance_type` to `standard-3` (2 vCPU) or `standard-4` (4 vCPU)
2. This gives more CPU power per container for faster processing
3. May allow each container to handle more concurrent requests

**Option 3: Increase uvicorn workers (for I/O-bound workloads)**
1. Update Dockerfile: `--workers 8` (from current 4)
2. Each container can handle more concurrent requests
3. Requires sufficient CPU resources

### To handle FEWER concurrent requests:
1. Decrease the number in `getRandom()`: `getRandom(this.env.PYTHON_EXECUTOR, 5)`
2. Consider downgrading instance type to save costs: `"instance_type": "standard-1"`
3. This will use fewer containers, reducing costs but also capacity

## Limitations & Future Improvements

### Current Limitations
- **Manual Scaling**: Fixed number of instances, no autoscaling
- **Random Selection**: Doesn't consider container location or load
- **No Health Checks**: Doesn't avoid unhealthy containers

### Planned Cloudflare Features
According to Cloudflare's roadmap, they plan to add:
- Native autoscaling based on traffic
- Latency-aware routing
- Resource-based scaling (CPU, memory)
- Configurable health checks

### When These Features Arrive
We can enable autoscaling by simply adding:
```typescript
export class PythonExecutorContainer extends Container {
  autoscale = true;  // Enable automatic scaling
  defaultPort = 8000;
}
```

## Monitoring

### How to Monitor Container Usage
1. **Cloudflare Dashboard**: View container metrics in the Workers & Pages section
2. **Logs**: Check workflow logs for container allocation patterns
3. **Errors**: Look for timeout errors indicating capacity issues

### Signs You Need More Capacity
- Frequent timeout errors from hallucination checks
- Slow processing times during peak usage
- Error messages about container unavailability

## Cost Considerations

### Container Costs
- Containers are billed based on:
  - Memory usage (GB-seconds)
  - CPU usage (vCPU-seconds)
  - Number of instances running

### Optimization Tips
1. **sleepAfter**: Set appropriately to balance warmth vs. idle costs
2. **Number of Instances**: Use only what you need for expected load
3. **Batch Processing**: Group requests to maximize container utilization

## References

- [Cloudflare Containers Documentation](https://developers.cloudflare.com/containers/)
- [Scaling and Routing Guide](https://developers.cloudflare.com/containers/scaling-and-routing/)
- [Container Limits](https://developers.cloudflare.com/workers/platform/limits/)
