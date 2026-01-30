import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, generateObject } from "ai";
import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
} from "cloudflare:workers";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { legalCompliance } from "../db/schema";

/**
 * Parameters for the Legal Compliance Workflow
 */
export interface LegalComplianceParams {
  contractBlocks: Array<{
    paragraph: string;
    content: string;
    anchorId: string;
  }>;
  complianceId: string; // ID of the legal_compliance record
  researchId: string; // ID of the parent research for logging
  locale?: string; // User's preferred language for AI-generated content (default: 'en')
}

/**
 * Legal article from BGB or HGB
 */
interface LegalArticle {
  type: string;
  id: string;
  name: string;
  title: string | null;
  body: string | null;
  source: "BGB" | "HGB";
}

/**
 * Result from Phase 1: Article identification (for a batch of blocks)
 */
interface ArticleIdentificationResult {
  blockResults: Array<{
    contractBlockIndex: number;
    hasViolation: boolean;
    relevantArticles: Array<{
      articleName: string;
      articleTitle: string;
      source: "BGB" | "HGB";
      reason: string;
    }>;
    needsDeepReview: boolean;
  }>;
}

/**
 * Result from Phase 2: Deep analysis
 */
interface DeepAnalysisResult {
  contractBlockIndex: number;
  articleName: string;
  articleTitle: string;
  source: "BGB" | "HGB";
  severity: "safe" | "minor" | "moderate" | "critical";
  violationDetails: string;
  recommendation: string;
}

// Legal code sources configuration
const ENABLE_BGB = false; // BGB (Bürgerliches Gesetzbuch) - Civil Code
const ENABLE_HGB = true; // HGB (Handelsgesetzbuch) - Commercial Code

// Token limit constant for batching (approximate)
const TOKEN_LIMIT = 200000; // 200k tokens total per batch

// Token allocation for Phase 1 context
const PHASE1_CONTRACT_TOKENS = 40000; // 40k tokens allocated for contract blocks
const PHASE1_LEGAL_TOKENS = 160000; // 160k tokens allocated for legal articles

// Maximum parallel runs
const MAX_PARALLEL_PHASE1 = 50;
const MAX_PARALLEL_PHASE2 = 50;

// Number of contract blocks to analyze together in Phase 1
const CONTRACT_BLOCKS_PER_BATCH = 5; // Analyze 5 contract blocks at once to reduce API calls

/**
 * Legal Compliance Workflow
 *
 * This workflow checks contract blocks against German legal codes (BGB & HGB):
 *
 * Phase 1: Article Identification
 * - Batch contract blocks by approximate token count
 * - Identify relevant legal articles for each block
 * - Flag blocks that need deep review
 *
 * Phase 2: Deep Analysis
 * - Analyze flagged blocks in detail against identified articles
 * - Determine violation severity and provide recommendations
 */
export class LegalComplianceWorkflow extends WorkflowEntrypoint<
  ResearchApiCloudflareBindings,
  LegalComplianceParams
> {
  async run(event: WorkflowEvent<LegalComplianceParams>, step: WorkflowStep) {
    const { contractBlocks, complianceId, researchId, locale = 'en' } = event.payload;
    const db = getDb(this.env);

    // Get language name for AI prompts
    const language = this.getLanguageName(locale);

    console.log(`[Workflow] Starting legal compliance workflow for research ${researchId}, compliance ${complianceId}`);
    console.log(`[Workflow] Contract blocks to analyze: ${contractBlocks.length}`);
    console.log(`[Workflow] Locale: ${locale}, Language for AI: ${language}`);

    try {
      // Update status: compliance check started
      await step.do("update-status-starting", async () => {
        console.log(`[Workflow] Updating compliance status to compliance_check`);
        await db
          .update(legalCompliance)
          .set({
            status: "in_progress",
            currentStage: "compliance_check",
            progress: 0,
            updatedAt: new Date(),
          })
          .where(eq(legalCompliance.id, complianceId));
      });

      // PHASE 1: Article Identification
      console.log(`[Workflow] === PHASE 1: Article Identification ===`);

      await step.do("update-status-phase1", async () => {
        await db
          .update(legalCompliance)
          .set({
            currentStage: "identifying_articles",
            progress: 10,
            updatedAt: new Date(),
          })
          .where(eq(legalCompliance.id, complianceId));
      });

      // Batch contract blocks to reduce API calls
      // Instead of analyzing each block separately, analyze CONTRACT_BLOCKS_PER_BATCH blocks together
      const contractBatches = this.chunkArray(contractBlocks, CONTRACT_BLOCKS_PER_BATCH);
      console.log(`[Workflow] Created ${contractBatches.length} contract batches (${CONTRACT_BLOCKS_PER_BATCH} blocks per batch)`);

      const phase1Results: ArticleIdentificationResult["blockResults"] = [];

      // Split contract batches into chunks for parallel processing
      const processingChunks = this.chunkArray(
        contractBatches.map((batch, batchIndex) => ({ batch, batchIndex })),
        MAX_PARALLEL_PHASE1
      );

      for (let chunkIndex = 0; chunkIndex < processingChunks.length; chunkIndex++) {
        const chunk = processingChunks[chunkIndex];
        console.log(`[Workflow] Processing Phase 1 chunk ${chunkIndex + 1}/${processingChunks.length} (${chunk.length} batches)`);

        // Process this chunk in parallel
        const chunkPromises = chunk.map(({ batch, batchIndex }) => {
          const startBlockIndex = batchIndex * CONTRACT_BLOCKS_PER_BATCH;
          return step.do(`phase1-batch-${batchIndex}`, async () => {
            console.log(`[Workflow] Phase 1: Analyzing batch ${batchIndex} (blocks ${startBlockIndex}-${startBlockIndex + batch.length - 1})`);
            // Load legal codes inside this step to avoid 1MB state limit
            const legalArticles = await this.loadLegalCodes();
            const legalBatches = this.batchByTokenLimit(legalArticles, TOKEN_LIMIT);

            return await this.identifyRelevantArticlesBatch(
              batch,
              startBlockIndex,
              legalBatches,
              language
            );
          });
        });

        const chunkResults = await Promise.all(chunkPromises);
        // Flatten batch results into individual block results
        for (const batchResult of chunkResults) {
          phase1Results.push(...batchResult.blockResults);
        }

        // Update progress (10% to 50%)
        const progress = 10 + Math.round((40 * (chunkIndex + 1)) / processingChunks.length);
        await step.do(`update-progress-phase1-${chunkIndex}`, async () => {
          await db
            .update(legalCompliance)
            .set({
              progress,
              updatedAt: new Date(),
            })
            .where(eq(legalCompliance.id, complianceId));
        });
      }

      console.log(`[Workflow] Phase 1 complete. Found ${phase1Results.filter(r => r.hasViolation).length} potential violations`);

      // PHASE 2: Deep Analysis
      console.log(`[Workflow] === PHASE 2: Deep Analysis ===`);

      await step.do("update-status-phase2", async () => {
        await db
          .update(legalCompliance)
          .set({
            currentStage: "deep_analysis",
            progress: 50,
            updatedAt: new Date(),
          })
          .where(eq(legalCompliance.id, complianceId));
      });

      // Get blocks that need deep review
      const blocksNeedingReview = phase1Results.filter((r: any) => r.needsDeepReview);
      console.log(`[Workflow] ${blocksNeedingReview.length} blocks need deep analysis`);

      const phase2Results: DeepAnalysisResult[] = [];

      if (blocksNeedingReview.length > 0) {
        // Get available sources from the legal codes we loaded
        const availableSources = new Set<string>();
        if (ENABLE_BGB) availableSources.add("BGB");
        if (ENABLE_HGB) availableSources.add("HGB");

        // Create tasks for each block-article pair
        const reviewTasks: Array<{
          blockIndex: number;
          block: typeof contractBlocks[0];
          article: ArticleIdentificationResult["blockResults"][0]["relevantArticles"][0];
        }> = [];

        let skippedArticles = 0;
        for (const result of blocksNeedingReview) {
          const block = contractBlocks[result.contractBlockIndex];
          for (const article of result.relevantArticles) {
            // Filter out articles from legal codes that aren't loaded
            if (!availableSources.has(article.source)) {
              console.warn(`[Workflow] Skipping article ${article.articleName} from ${article.source} - this legal code is not loaded`);
              skippedArticles++;
              continue;
            }

            reviewTasks.push({
              blockIndex: result.contractBlockIndex,
              block,
              article,
            });
          }
        }

        if (skippedArticles > 0) {
          console.log(`[Workflow] Skipped ${skippedArticles} articles from disabled legal codes`);
        }

        console.log(`[Workflow] Created ${reviewTasks.length} deep analysis tasks`);

        // Process in parallel chunks
        const reviewChunks = this.chunkArray(reviewTasks, MAX_PARALLEL_PHASE2);

        for (let chunkIndex = 0; chunkIndex < reviewChunks.length; chunkIndex++) {
          const chunk = reviewChunks[chunkIndex];
          console.log(`[Workflow] Processing Phase 2 chunk ${chunkIndex + 1}/${reviewChunks.length} (${chunk.length} tasks)`);

          const chunkPromises = chunk.map((task, idx) => {
            const taskId = chunkIndex * MAX_PARALLEL_PHASE2 + idx;
            return step.do(`phase2-task-${taskId}`, async () => {
              console.log(`[Workflow] Phase 2: Deep analysis task ${taskId}`);
              // Load legal codes inside this step to avoid 1MB state limit
              const legalArticles = await this.loadLegalCodes();

              return await this.performDeepAnalysis(
                task.block,
                task.blockIndex,
                task.article,
                legalArticles,
                language
              );
            });
          });

          const chunkResults = await Promise.all(chunkPromises);
          // Filter out null results (articles that couldn't be found)
          const validResults = chunkResults.filter((result): result is DeepAnalysisResult => result !== null);
          phase2Results.push(...validResults);

          const skippedCount = chunkResults.length - validResults.length;
          if (skippedCount > 0) {
            console.log(`[Workflow] Skipped ${skippedCount} analyses due to missing article texts`);
          }

          // Update progress (50% to 90%)
          const progress = 50 + Math.round((40 * (chunkIndex + 1)) / reviewChunks.length);
          await step.do(`update-progress-phase2-${chunkIndex}`, async () => {
            await db
              .update(legalCompliance)
              .set({
                progress,
                updatedAt: new Date(),
              })
              .where(eq(legalCompliance.id, complianceId));
          });
        }
      }

      console.log(`[Workflow] Phase 2 complete. Analyzed ${phase2Results.length} article-block pairs`);

      // Final step: save results and mark as completed
      return await step.do("finalize-compliance-results", async () => {
        console.log(`[Workflow] Finalizing compliance check results`);

        const results = {
          phase1: phase1Results,
          phase2: phase2Results,
          summary: {
            totalBlocks: contractBlocks.length,
            blocksWithViolations: phase1Results.filter(r => r.hasViolation).length,
            criticalViolations: phase2Results.filter(r => r.severity === "critical").length,
            moderateViolations: phase2Results.filter(r => r.severity === "moderate").length,
            minorViolations: phase2Results.filter(r => r.severity === "minor").length,
          },
        };

        console.log(`[Workflow] Compliance check summary:`, results.summary);

        await db
          .update(legalCompliance)
          .set({
            status: "completed",
            currentStage: "compliance_completed",
            progress: 100,
            results: JSON.stringify(results),
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(legalCompliance.id, complianceId));

        console.log(`[Workflow] Compliance workflow completed successfully`);

        return {
          complianceId,
          researchId,
          ...results,
        };
      });

    } catch (error) {
      console.error(`[Workflow] Compliance workflow failed:`, error);

      const failureResult = await step.do("mark-compliance-failed", async () => {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

        await db
          .update(legalCompliance)
          .set({
            status: "failed",
            currentStage: "error",
            errorMessage: errorMessage,
            updatedAt: new Date(),
          })
          .where(eq(legalCompliance.id, complianceId));

        return {
          complianceId,
          researchId,
          success: false,
          error: errorMessage,
        };
      });

      return failureResult;
    }
  }

  /**
   * Load legal codes (BGB and HGB) from R2
   * Only loads enabled legal codes based on ENABLE_BGB and ENABLE_HGB constants
   */
  private async loadLegalCodes(): Promise<LegalArticle[]> {
    try {
      const bucket = this.env.research_assets;
      const allArticles: LegalArticle[] = [];

      // Load BGB if enabled
      if (ENABLE_BGB) {
        console.log(`[Workflow] Loading BGB from R2`);
        const bgbObject = await bucket.get("bgb.json");
        if (!bgbObject) {
          throw new Error("BGB file not found in R2");
        }
        const bgbData = await bgbObject.json() as any;
        // Note: R2 objects are automatically disposed after reading
        const bgbArticles: LegalArticle[] = (bgbData.data.contents || [])
          .filter((item: any) => item.type === "article" && item.body)
          .map((item: any) => ({
            type: item.type,
            id: item.id,
            name: item.name,
            title: item.title,
            body: item.body,
            source: "BGB" as const,
          }));

        console.log(`[Workflow] Loaded ${bgbArticles.length} BGB articles`);
        allArticles.push(...bgbArticles);
      } else {
        console.log(`[Workflow] BGB is disabled, skipping`);
      }

      // Load HGB if enabled
      if (ENABLE_HGB) {
        console.log(`[Workflow] Loading HGB from R2`);
        const hgbObject = await bucket.get("hgb.json");
        if (!hgbObject) {
          throw new Error("HGB file not found in R2");
        }
        const hgbData = await hgbObject.json() as any;
        const hgbArticles: LegalArticle[] = (hgbData.data.contents || [])
          .filter((item: any) => item.type === "article" && item.body)
          .map((item: any) => ({
            type: item.type,
            id: item.id,
            name: item.name,
            title: item.title,
            body: item.body,
            source: "HGB" as const,
          }));

        console.log(`[Workflow] Loaded ${hgbArticles.length} HGB articles`);
        allArticles.push(...hgbArticles);
      } else {
        console.log(`[Workflow] HGB is disabled, skipping`);
      }

      if (allArticles.length === 0) {
        throw new Error("No legal codes are enabled. Please enable at least one of BGB or HGB.");
      }

      console.log(`[Workflow] Total legal articles loaded: ${allArticles.length}`);
      return allArticles;
    } catch (error) {
      console.error(`[Workflow] Error loading legal codes:`, error);
      throw new Error(
        `Failed to load legal codes: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Approximate token count (roughly 4 characters per token for German text)
   */
  private approximateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Batch legal articles by approximate token limit
   */
  private batchByTokenLimit(articles: LegalArticle[], tokenLimit: number): LegalArticle[][] {
    const batches: LegalArticle[][] = [];
    let currentBatch: LegalArticle[] = [];
    let currentTokens = 0;

    for (const article of articles) {
      const articleText = `${article.name} ${article.title || ""} ${article.body || ""}`;
      const articleTokens = this.approximateTokenCount(articleText);

      // If adding this article would exceed limit, start new batch
      if (currentTokens + articleTokens > tokenLimit && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [article];
        currentTokens = articleTokens;
      } else {
        currentBatch.push(article);
        currentTokens += articleTokens;
      }
    }

    // Add the last batch if it has any articles
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  /**
   * Phase 1: Identify relevant legal articles for a BATCH of contract blocks
   */
  private async identifyRelevantArticlesBatch(
    contractBlocks: LegalComplianceParams["contractBlocks"],
    startBlockIndex: number,
    legalBatches: LegalArticle[][],
    language: string = 'English'
  ): Promise<ArticleIdentificationResult> {
    const openrouterApiKey = this.env.OPENROUTER_API_KEY;

    if (!openrouterApiKey) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    try {
      const openrouter = createOpenRouter({
        apiKey: openrouterApiKey,
      });

      // Format contract blocks for the prompt
      const contractBlocksText = contractBlocks
        .map((block, idx) => {
          const blockNum = startBlockIndex + idx;
          return `**Block ${blockNum}:**
Section: ${block.paragraph}
Content: ${block.content}`;
        })
        .join("\n\n");

      // Check contract blocks token count
      const contractTokens = this.approximateTokenCount(contractBlocksText);
      console.log(`[Workflow] Contract blocks use ${contractTokens} tokens (budget: ${PHASE1_CONTRACT_TOKENS})`);

      if (contractTokens > PHASE1_CONTRACT_TOKENS) {
        console.warn(`[Workflow] Warning: Contract blocks exceed token budget (${contractTokens} > ${PHASE1_CONTRACT_TOKENS})`);
      }

      // Fit as many FULL legal articles as possible within token budget
      // Start with first batch and add articles until we hit the token limit
      const selectedArticles: LegalArticle[] = [];
      let currentLegalTokens = 0;

      for (const batch of legalBatches) {
        for (const article of batch) {
          const body = article.body?.replace(/<[^>]*>/g, " ").trim() || "";
          const articleText = `[${article.source}] ${article.name} - ${article.title || "Untitled"}:\n${body}`;
          const articleTokens = this.approximateTokenCount(articleText);

          // Check if adding this article would exceed our legal token budget
          if (currentLegalTokens + articleTokens > PHASE1_LEGAL_TOKENS) {
            break; // Stop adding articles
          }

          selectedArticles.push(article);
          currentLegalTokens += articleTokens;
        }

        // If we've filled our budget, stop processing batches
        if (currentLegalTokens >= PHASE1_LEGAL_TOKENS) {
          break;
        }
      }

      console.log(`[Workflow] Selected ${selectedArticles.length} legal articles (${currentLegalTokens} tokens) for Phase 1 batch`);

      const legalContext = selectedArticles
        .map((article) => {
          const body = article.body?.replace(/<[^>]*>/g, " ").trim() || "";
          return `[${article.source}] ${article.name} - ${article.title || "Untitled"}:\n${body}`;
        })
        .join("\n\n");

      // Determine which legal codes are available
      const availableSources = Array.from(new Set(selectedArticles.map(a => a.source)));
      const sourcesText = availableSources.join(" and ");

      // Step 1: Generate text response
      const textResult = await generateText({
        model: openrouter("google/gemini-2.5-flash-lite"),
        messages: [
          {
            role: "system",
            content: `You are a German legal expert analyzing contract clauses against German legal codes.

CRITICAL REQUIREMENTS:
1. You can ONLY reference articles from the legal codes provided in the list below
2. You MUST use the EXACT article name format from the provided list (e.g., if the list shows "§ 105", use "§ 105" - not "HGB § 105", "Art. 105", or "§105")
3. Do NOT reference any articles that are not explicitly in the provided list
4. Do NOT reference BGB if only HGB is provided, and vice versa

Available legal codes: ${sourcesText}

When identifying relevant articles, copy the exact article name (article.name) from the provided list.

All responses must be in ${language}.`,
          },
          {
            role: "user",
            content: `Analyze these contract blocks against the provided legal codes:

${contractBlocksText}

**Available Legal Articles (${sourcesText}):**
${legalContext}

CRITICAL: When you identify a relevant article, use the EXACT article name format as it appears in the brackets above.
For example, if you see "[HGB] § 105 - Some Title", you MUST use articleName: "§ 105" (exactly as shown).

Only identify articles that are explicitly listed above. Do not invent or reference articles not in this list.`,
          },
        ],
      });

      // Step 2: Parse the text response into structured format using generateObject
      const identificationSchema = z.object({
        blockResults: z.array(
          z.object({
            contractBlockIndex: z.number().describe("The index of the contract block"),
            hasViolation: z.boolean().describe("Whether this block potentially violates any legal articles"),
            relevantArticles: z.array(
              z.object({
                articleName: z.string().describe("The EXACT article name as it appears in the provided list (e.g., '§ 133', '§ 242' - must match exactly for database lookup)"),
                articleTitle: z.string().describe("The title of the article"),
                source: z.enum(["BGB", "HGB"]).describe("Which legal code the article is from"),
                reason: z.string().describe("Brief explanation of why this article is relevant"),
              })
            ).describe("List of relevant legal articles"),
            needsDeepReview: z.boolean().describe("Whether this needs detailed analysis in Phase 2"),
          })
        ).describe("Results for each contract block"),
      });

      let result;
      try {
        const structuredResult = await generateObject({
          model: openrouter("google/gemini-2.5-flash-lite"),
          schema: identificationSchema,
          messages: [
            {
              role: "system",
              content: `You are a JSON parser. Convert the legal analysis text into structured JSON format.`,
            },
            {
              role: "user",
              content: `Convert this legal analysis into structured JSON format:

${textResult.text}

Create an array of blockResults, one for each contract block (${contractBlocks.length} total).
Each result should have:
- contractBlockIndex (starting from ${startBlockIndex})
- hasViolation (boolean)
- relevantArticles (array with EXACT articleName as shown in the provided list, articleTitle, source, reason)
- needsDeepReview (boolean)

IMPORTANT: The articleName must match EXACTLY as it appears in the provided legal articles list (e.g., "§ 105" not "HGB § 105").

If no relevant articles are found for a block, set hasViolation to false and relevantArticles to empty array.`,
            },
          ],
        });

        result = structuredResult.object;
      } catch (parseError) {
        console.error(`[Workflow] Failed to structure batch response:`, parseError);
        console.error(`[Workflow] Original text:`, textResult.text);
        // Return empty results for all blocks in this batch
        return {
          blockResults: contractBlocks.map((_, idx) => ({
            contractBlockIndex: startBlockIndex + idx,
            hasViolation: false,
            relevantArticles: [],
            needsDeepReview: false,
          })),
        };
      }

      return result;

    } catch (error) {
      console.error(`[Workflow] Error in Phase 1 for batch starting at ${startBlockIndex}:`, error);
      throw new Error(
        `Failed to identify articles for batch starting at ${startBlockIndex}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Phase 2: Perform deep analysis of a contract block against a specific legal article
   * Returns null if the article text cannot be found
   */
  private async performDeepAnalysis(
    contractBlock: LegalComplianceParams["contractBlocks"][0],
    blockIndex: number,
    identifiedArticle: ArticleIdentificationResult["blockResults"][0]["relevantArticles"][0],
    allLegalArticles: LegalArticle[],
    language: string = 'English'
  ): Promise<DeepAnalysisResult | null> {
    const openrouterApiKey = this.env.OPENROUTER_API_KEY;

    if (!openrouterApiKey) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    try {
      const openrouter = createOpenRouter({
        apiKey: openrouterApiKey,
      });

      // Find the full article text
      const fullArticle = allLegalArticles.find(
        (a) => a.name === identifiedArticle.articleName && a.source === identifiedArticle.source
      );

      if (!fullArticle) {
        console.warn(`[Workflow] Could not find full text for ${identifiedArticle.articleName} in ${identifiedArticle.source} - skipping this analysis`);
        return null; // Skip analysis if article not found
      }

      const articleBody = fullArticle.body?.replace(/<[^>]*>/g, " ").trim() || "";

      // Step 1: Generate text response
      const textResult = await generateText({
        model: openrouter("google/gemini-2.5-flash-lite"),
        messages: [
          {
            role: "system",
            content: `You are an expert German legal analyst conducting deep compliance review.

Analyze the contract clause against the specific legal article and provide:
1. Severity assessment (safe, minor, moderate, critical)
2. Detailed violation analysis
3. Actionable recommendations

Be thorough and precise in your legal analysis.

All responses must be in ${language}.`,
          },
          {
            role: "user",
            content: `Conduct a detailed legal analysis:

**Contract Clause:**
Section: ${contractBlock.paragraph}
Content: ${contractBlock.content}

**Legal Article:**
[${identifiedArticle.source}] ${identifiedArticle.articleName} - ${identifiedArticle.articleTitle}
${articleBody}

**Initial Assessment:**
${identifiedArticle.reason}

Provide a comprehensive analysis of compliance and recommendations.`,
          },
        ],
      });

      // Step 2: Parse the text response into structured format using generateObject
      const deepAnalysisSchema = z.object({
        severity: z.enum(["safe", "minor", "moderate", "critical"]).describe(
          "Severity of the violation: safe (no issue), minor (best practice), moderate (significant concern), critical (likely violation)"
        ),
        violationDetails: z.string().describe(
          "Detailed explanation of how the contract clause relates to or violates the legal article"
        ),
        recommendation: z.string().describe(
          "Specific recommendation for addressing the issue or confirming compliance"
        ),
      });

      let result;
      try {
        const structuredResult = await generateObject({
          model: openrouter("google/gemini-2.5-flash-lite"),
          schema: deepAnalysisSchema,
          messages: [
            {
              role: "system",
              content: `You are a JSON parser. Convert the legal analysis text into structured JSON format.`,
            },
            {
              role: "user",
              content: `Convert this legal analysis into structured JSON format:

${textResult.text}

Extract:
- severity (one of: safe, minor, moderate, critical)
- violationDetails (detailed explanation)
- recommendation (specific recommendation)`,
            },
          ],
        });

        result = structuredResult.object;
      } catch (parseError) {
        console.error(`[Workflow] Failed to structure deep analysis response:`, parseError);
        console.error(`[Workflow] Original text:`, textResult.text);
        throw new Error(`Failed to structure deep analysis response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }

      return {
        contractBlockIndex: blockIndex,
        articleName: identifiedArticle.articleName,
        articleTitle: identifiedArticle.articleTitle,
        source: identifiedArticle.source,
        severity: result.severity,
        violationDetails: result.violationDetails,
        recommendation: result.recommendation,
      };

    } catch (error) {
      console.error(`[Workflow] Error in Phase 2 for block ${blockIndex}:`, error);
      throw new Error(
        `Failed deep analysis for block ${blockIndex}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Split an array into chunks of specified size
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Map locale code to full language name for AI prompts
   */
  private getLanguageName(locale: string): string {
    const languageMap: Record<string, string> = {
      'en': 'English',
      'ru': 'Russian',
      // Add more languages as needed
    };
    return languageMap[locale] || 'English'; // Default to English
  }
}
