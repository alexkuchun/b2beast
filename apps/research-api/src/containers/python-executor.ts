import { Container } from '@cloudflare/containers';

export class PythonExecutorContainer extends Container {
	// Port that the FastAPI server listens on
	defaultPort = 8000;

	// How long to keep the container alive after the last request
	// Increased to keep containers warm during heavy processing
	sleepAfter = '15m';

	// Container configuration:
	// - max_instances: 10 (configured in wrangler.jsonc)
	// - instance_type: standard-2 (1 vCPU, 6 GiB memory, 12 GB disk)
	// - Each container can handle ~5 concurrent requests with 4 uvicorn workers
	// - Total capacity: 10 containers × 5 requests = ~50 concurrent requests
}
