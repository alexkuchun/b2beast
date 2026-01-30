// Augment the Cloudflare environment bindings with secrets
declare namespace Cloudflare {
	interface Env {
		OPENAI_API_KEY: string;
		OPENROUTER_API_KEY: string;
		research_assets: R2Bucket;
	}
}

// Extend the generated bindings
// Note: R2 bucket (research_assets) is automatically included via worker-configuration.d.ts
interface ResearchApiCloudflareBindings {
	OPENAI_API_KEY: string;
	OPENROUTER_API_KEY: string;
	research_assets: R2Bucket;
}
