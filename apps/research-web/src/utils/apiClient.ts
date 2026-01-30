import { hc } from 'hono/client';
import { ApiType } from '@b2beast/api-types';
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const getClient = () => {
    const context = getCloudflareContext();
    return hc<ApiType>('https://research-api', {
        fetch: (context.env as ResearchWebEnv).RESEARCH_API.fetch.bind((context.env as ResearchWebEnv).RESEARCH_API),
    });
}
