/**
 * Extended environment types for Cloudflare Workers
 * Following the recommended approach from the Cloudflare team
 */

// Import the base types from the worker configuration files

import '../research-api/worker-configuration';

// Extend the interfaces with the missing properties
declare global {
  // Add the missing properties to the ResearchApiCloudflareBindings interface
  interface ResearchApiCloudflareBindings {
    DB: D1Database;
    CORS_ORIGINS: string;
    OPENAI_API_KEY: string;
    OPENROUTER_API_KEY: string;
    PDF_PARSER_WORKFLOW: Workflow;
    research_assets: R2Bucket;
    PYTHON_EXECUTOR: DurableObjectNamespace<import('../research-api/src/index').PythonExecutorContainer>;
    LEGAL_COMPLIANCE_WORKFLOW: Workflow;
  }

  // Define the main CloudflareBindings interface for the app
  interface CloudflareBindings extends ResearchApiCloudflareBindings {
    // Add service bindings with their correct types
    // RESEARCH_API: Fetcher<typeof import('../research-api/src/index').default>;
    research_assets: R2Bucket;

  }
}

// Define the Service type for RPC methods
type Service<T> = {
  fetch(request: Request): Promise<Response>;
} & T;
