import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
} from "cloudflare:workers";
import { z } from "zod";
import { eq } from "drizzle-orm";
import type { ContractBlock, ContractBlockReview } from "../types/types";
import { getDb } from "../db";
import { research } from "../db/schema";

/**
 * Parameters for the PDF Parser Workflow
 */
export interface PdfParserParams {
  contractKey: string; // R2 key path to the PDF file
  totalPages: number; // Total number of pages in the PDF
  researchId: string; // Research record ID for tracking
  locale?: string; // User's preferred language for AI-generated content (default: 'en')
}

/**
 * PDF Parser Workflow
 *
 * This workflow processes a PDF file end-to-end:
 * 1. STEP 0: Fetch PDF from R2 bucket
 * 2. STEP 1: Parse PDF - For each page, extract paragraphs with content in markdown
 * 3. STEP 2: Review Blocks - Analyze each block for legal risks in batches of 20
 * 4. STEP 3: Generate Summary - Create overall document summary with severity level and top 3 issues
 * 5. Returns the parsed blocks, risk assessments, and document summary
 */
export class PdfParserWorkflow extends WorkflowEntrypoint<
  ResearchApiCloudflareBindings,
  PdfParserParams
> {
  async run(event: WorkflowEvent<PdfParserParams>, step: WorkflowStep) {
    const { contractKey, totalPages, researchId, locale = 'en' } = event.payload;
    const db = getDb(this.env);

    // Get language name for AI prompts
    const language = this.getLanguageName(locale);

    console.log(`[Workflow] Starting PDF parser workflow for research ${researchId}`);
    console.log(`[Workflow] Contract key: ${contractKey}, Total pages: ${totalPages}`);
    console.log(`[Workflow] Locale: ${locale}, Language for AI: ${language}`);

    try {
      // Update status: parsing started
      await step.do("update-status-parsing", async () => {
      console.log(`[Workflow] Updating status to parsing for research ${researchId}`);
      await db
        .update(research)
        .set({
          status: "in_progress",
          currentStage: "parsing",
          progress: 0,
          updatedAt: new Date(),
        })
        .where(eq(research.id, researchId));
      console.log(`[Workflow] Status updated to parsing`);
    });

    // Array to store all parsed blocks from all pages
    const allBlocks: ContractBlock[] = [];

    // Process pages in batches for better progress tracking
    const PAGES_PER_BATCH = 5; // Process 5 pages at a time
    const pageBatches = this.chunkArray(
      Array.from({ length: totalPages }, (_, i) => i + 1),
      PAGES_PER_BATCH
    );

    console.log(`[Workflow] Starting to parse ${totalPages} pages in ${pageBatches.length} batches (${PAGES_PER_BATCH} pages per batch)`);

    for (let batchIndex = 0; batchIndex < pageBatches.length; batchIndex++) {
      const pageBatch = pageBatches[batchIndex];
      console.log(`[Workflow] Processing parsing batch ${batchIndex + 1}/${pageBatches.length} (pages ${pageBatch[0]}-${pageBatch[pageBatch.length - 1]})`);

      // Process pages in this batch in parallel
      const pagePromises = pageBatch.map(pageNumber =>
        step.do(`parse-page-${pageNumber}`, async () => {
          console.log(`[Workflow] Processing page ${pageNumber}/${totalPages}`);
          console.log(`[Workflow] Fetching PDF from R2 for page ${pageNumber}`);

          // Fetch PDF from R2 inside this step
          const pdfBase64 = await this.getObject(contractKey);
          console.log(`[Workflow] PDF fetched for page ${pageNumber}, size: ${pdfBase64.length} chars`);

          console.log(`[Workflow] Parsing page ${pageNumber} with AI`);
          const blocks = await this.parsePdfPage(pdfBase64, pageNumber, language);
          console.log(`[Workflow] Page ${pageNumber} parsed, found ${blocks.length} blocks`);
          return { pageNumber, blocks };
        })
      );

      // Wait for all pages in this batch to complete
      const batchResults = await Promise.all(pagePromises);

      // Sort by page number and add to allBlocks
      batchResults.sort((a, b) => a.pageNumber - b.pageNumber);
      for (const result of batchResults) {
        allBlocks.push(...result.blocks);
      }

      console.log(`[Workflow] Batch ${batchIndex + 1} complete. Total blocks so far: ${allBlocks.length}`);

      // Update progress after each batch (0% to 50%)
      await step.do(`update-progress-parsing-batch-${batchIndex}`, async () => {
        const parsingProgress = Math.round((50 * (batchIndex + 1)) / pageBatches.length);
        console.log(`[Workflow] Updating progress: parsed ${batchIndex + 1}/${pageBatches.length} batches (${parsingProgress}%)`);
        await db
          .update(research)
          .set({
            currentStage: "parsing",
            progress: parsingProgress,
            updatedAt: new Date(),
          })
          .where(eq(research.id, researchId));
      });
    }

    console.log(`[Workflow] Finished parsing all pages. Total blocks: ${allBlocks.length}`);

    // Update status: reviewing started
    await step.do("update-status-reviewing", async () => {
      console.log(`[Workflow] Updating status to reviewing`);
      await db
        .update(research)
        .set({
          currentStage: "reviewing",
          progress: 50,
          updatedAt: new Date(),
        })
        .where(eq(research.id, researchId));
      console.log(`[Workflow] Status updated to reviewing`);
    });

    // STEP 2: Review contract blocks for risks
    const allReviews: ContractBlockReview[] = [];

    // Only process reviews if we have blocks
    if (allBlocks.length > 0) {
      // Split blocks into batches of 30 for concurrent processing
      // With 10 containers (each handling ~5 concurrent requests), we can handle ~50 total
      // Using 30 gives us good throughput while leaving headroom for spikes
      const batches = this.chunkArray(allBlocks, 30);
      console.log(`[Workflow] Reviewing ${allBlocks.length} blocks in ${batches.length} batches`);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        console.log(`[Workflow] Processing review batch ${batchIndex + 1}/${batches.length} (${batches[batchIndex].length} blocks)`);

        const batchReviews = await step.do(
          `review-batch-${batchIndex}`,
          {
            timeout: "10 minutes" // Increased timeout for larger batches and container cold starts
          },
          async () => {
            // Process up to 30 blocks in parallel using Promise.all
            // Load balanced across 10 container instances
            const reviewPromises = batches[batchIndex].map((block, idx) => {
              const globalIndex = batchIndex * 30 + idx;
              console.log(`[Workflow] Reviewing block ${globalIndex} in batch ${batchIndex}`);
              return this.reviewBlock(block, globalIndex, language);
            });

            const results = await Promise.all(reviewPromises);
            console.log(`[Workflow] Batch ${batchIndex} reviews completed`);
            return results;
          }
        );

        allReviews.push(...batchReviews);
        console.log(`[Workflow] Total reviews so far: ${allReviews.length}`);

        // Update progress after each batch (50% to 100%)
        await step.do(`update-progress-batch-${batchIndex}`, async () => {
          const reviewProgress = 50 + Math.round((50 * (batchIndex + 1)) / batches.length);
          console.log(`[Workflow] Updating progress: batch ${batchIndex + 1}/${batches.length} (${reviewProgress}%)`);
          await db
            .update(research)
            .set({
              currentStage: "reviewing",
              progress: reviewProgress,
              updatedAt: new Date(),
            })
            .where(eq(research.id, researchId));
        });
      }

      console.log(`[Workflow] Finished reviewing all blocks. Total reviews: ${allReviews.length}`);
    } else {
      console.log(`[Workflow] No blocks to review`);
    }

    // STEP 3: Generate document summary
    let documentSummary = null;
    if (allReviews.length > 0) {
      await step.do("update-status-summarizing", async () => {
        console.log(`[Workflow] Updating status to summarizing`);
        await db
          .update(research)
          .set({
            currentStage: "summarizing",
            updatedAt: new Date(),
          })
          .where(eq(research.id, researchId));
      });

      documentSummary = await step.do("generate-summary", async () => {
        console.log(`[Workflow] Generating document summary from ${allReviews.length} reviews`);
        return await this.generateDocumentSummary(allReviews, allBlocks, language);
      });

      console.log(`[Workflow] Document summary generated`);
    }

    // Final step: save results and mark as completed
    return await step.do("finalize-results", async () => {
      console.log(`[Workflow] Finalizing results for research ${researchId}`);
      const results = {
        totalPages,
        totalBlocks: allBlocks.length,
        blocks: allBlocks,
        reviews: allReviews,
      };

      console.log(`[Workflow] Results summary: ${totalPages} pages, ${allBlocks.length} blocks, ${allReviews.length} reviews`);

      // Extract title from summary if available
      let extractedTitle: string | null = null;
      if (documentSummary) {
        try {
          const summaryObj = JSON.parse(documentSummary);
          extractedTitle = summaryObj.title || null;
        } catch (error) {
          console.error('[Workflow] Failed to parse summary for title extraction:', error);
        }
      }

      // Save results to database
      console.log(`[Workflow] Saving results to database`);
      await db
        .update(research)
        .set({
          status: "completed",
          currentStage: "completed",
          progress: 100,
          results: JSON.stringify(results),
          summary: documentSummary,
          title: extractedTitle, // Save the AI-generated title
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(research.id, researchId));

      console.log(`[Workflow] Workflow completed successfully for research ${researchId}`);

      return {
        researchId,
        ...results,
      };
    });
    } catch (error) {
      // Handle workflow errors gracefully
      console.error(`[Workflow] Workflow failed for research ${researchId}:`, error);

      // Update database to mark as failed
      const failureResult = await step.do("mark-workflow-failed", async () => {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        console.log(`[Workflow] Marking research ${researchId} as failed with error: ${errorMessage}`);

        await db
          .update(research)
          .set({
            status: "failed",
            currentStage: "error",
            errorMessage: errorMessage,
            updatedAt: new Date(),
          })
          .where(eq(research.id, researchId));

        console.log(`[Workflow] Research ${researchId} marked as failed in database`);

        return {
          researchId,
          success: false,
          error: errorMessage,
        };
      });

      // Return the failure result instead of throwing
      // This allows the workflow to complete gracefully rather than entering "Errored" state
      return failureResult;
    }
  }

  /**
   * Helper function to fetch an object from R2 and convert to base64
   * This should be called inside step.do() to avoid passing large data between steps
   */
  private async getObject(key: string): Promise<string> {
    try {
      console.log(`[Workflow] Fetching object from R2: ${key}`);
      const bucket = this.env.research_assets;

      // Fetch the PDF from R2
      const object = await bucket.get(key);

      if (!object) {
        console.error(`[Workflow] Object not found in R2: ${key}`);
        throw new Error(`Object not found in R2 with key: ${key}`);
      }

      console.log(`[Workflow] Object fetched from R2, reading as ArrayBuffer`);
      // Read the PDF as ArrayBuffer
      const arrayBuffer = await object.arrayBuffer();
      console.log(`[Workflow] ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);

      // Convert ArrayBuffer to base64 in chunks to avoid stack overflow
      const uint8Array = new Uint8Array(arrayBuffer);
      let binaryString = '';
      const chunkSize = 8192; // Process 8KB at a time
      const totalChunks = Math.ceil(uint8Array.length / chunkSize);

      console.log(`[Workflow] Converting to base64 in ${totalChunks} chunks`);
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binaryString += String.fromCharCode(...chunk);

        if ((i / chunkSize) % 10 === 0) {
          console.log(`[Workflow] Processed chunk ${Math.floor(i / chunkSize) + 1}/${totalChunks}`);
        }
      }

      console.log(`[Workflow] Converting binary string to base64`);
      const base64 = btoa(binaryString);
      console.log(`[Workflow] Base64 conversion complete, length: ${base64.length}`);

      return base64;
    } catch (error) {
      console.error(`[Workflow] Error fetching object from R2:`, error);
      throw new Error(
        `Failed to fetch object from R2: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Parse a single page of the PDF using OpenAI via AI SDK
   */
  private async parsePdfPage(
    pdfBase64: string,
    pageNumber: number,
    language: string = 'English'
  ): Promise<ContractBlock[]> {
    const openrouterApiKey = this.env.OPENROUTER_API_KEY;

    if (!openrouterApiKey) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    try {
      // Create OpenRouter provider with AI SDK
      const openrouter = createOpenRouter({
        apiKey: openrouterApiKey,
      });

      // Define the schema for the expected output
      const paragraphSchema = z.object({
        paragraphs: z.array(
          z.object({
            paragraph: z
              .string()
              .describe(
                'Brief identifier or title for the paragraph (e.g., "Section 1.1", "Introduction", "Payment Terms")'
              ),
            content: z
              .string()
              .describe("Full paragraph content in markdown format"),
          })
        ),
      });

      // Use AI SDK's generateObject for structured output
      const result = await generateObject({
        model: openrouter("google/gemini-2.5-flash"),
        schema: paragraphSchema,
        messages: [
          {
            role: "system",
            content: `You are a legal document parser. Extract all paragraphs from the provided PDF page.

For each paragraph, provide:
1. A brief identifier/title for the paragraph (e.g., "Section 1.1", "Introduction", "Payment Terms")
2. The full content of the paragraph in markdown format

Important:
- Preserve all formatting, lists, and structure using markdown
- Include all text content from the page
- Keep legal terminology and clause numbers intact
- If a paragraph spans columns or has complex formatting, preserve the logical reading order`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Parse page ${pageNumber} of this PDF document. Extract all paragraphs with their identifiers and content.`,
              },
              {
                type: "file",
                data: `data:application/pdf;base64,${pdfBase64}`,
                mediaType: "application/pdf",
              },
            ],
          },
        ],
      });

      // Add page number and anchor ID to each block
      return result.object.paragraphs.map((block, index) => ({
        paragraph: block.paragraph,
        content: block.content,
        pageNumber,
        anchorId: `p${pageNumber}-${index}`, // Create unique anchor ID
      }));
    } catch (error) {
      console.error(`Error parsing page ${pageNumber}:`, error);
      throw new Error(
        `Failed to parse page ${pageNumber}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Review a single contract block using OpenAI via AI SDK
   */
  private async reviewBlock(
    block: ContractBlock,
    blockIndex: number,
    language: string = 'English'
  ): Promise<ContractBlockReview> {
    const openrouterApiKey = this.env.OPENROUTER_API_KEY;

    if (!openrouterApiKey) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    try {
      // Create OpenRouter provider with AI SDK
      const openrouter = createOpenRouter({
        apiKey: openrouterApiKey,
      });

      // Define the schema for the expected output
      const reviewSchema = z.object({
        severity: z
          .enum(["safe", "medium", "elevated", "high"])
          .describe("Risk severity level of the identified issue"),
        start: z
          .number()
          .describe(
            "Start character position in the content of the section to highlight"
          ),
        end: z
          .number()
          .describe(
            "End character position in the content of the section to highlight"
          ),
        comment: z
          .string()
          .describe(
            "Clear explanation of the identified risk and its implications"
          ),
      });

      // Use AI SDK's generateObject for structured output
      const result = await generateObject({
        model: openrouter("google/gemini-2.5-flash"),
        schema: reviewSchema,
        messages: [
          {
            role: "system",
            content: `You are a legal contract risk analyzer. Evaluate contract paragraphs for potential risks including:

- Hidden fees or unexpected costs
- Heavy penalties or unfair damages
- Unrealistic deadlines or obligations
- Unclear or ambiguous terms
- Unfavorable termination clauses
- Excessive liability exposure
- Unbalanced rights and obligations
- Missing protections or safeguards

Classify severity levels:
- safe: No significant issues identified
- medium: Minor concerns that should be reviewed
- elevated: Significant risks that need attention
- high: Critical issues requiring immediate review

Some paragraphs may include no meaningful text, but just headers or titles of sections. Treat such paragraphs as safe.

For each assessment, provide the character positions (start and end) in the content that should be highlighted. For risky content, highlight the specific problematic clause. For safe content, you can highlight the entire block or key reassuring clauses.`,
          },
          {
            role: "user",
            content: `Analyze this contract paragraph:

**Section: ${block.paragraph}**

${block.content}

Provide the character positions (start and end) in the content that should be highlighted for this assessment. If risky, highlight the specific problematic text. If safe, you can highlight the entire paragraph or leave positions at 0. Explain your assessment clearly.
All answers must be in ${language}, no matter what language the contract is in.`,
},
        ],
      });

      // Validate and clamp character positions for highlighting
      const contentLength = block.content.length;
      let start = Math.max(0, Math.min(result.object.start, contentLength));
      let end = Math.max(0, Math.min(result.object.end, contentLength));

      // Ensure start <= end
      if (start > end) {
        [start, end] = [end, start];
      }

      // For safe blocks, highlight the entire block (or set to 0 if no highlighting needed)
      // Frontend can decide whether to show highlighting for safe blocks
      if (result.object.severity === "safe") {
        // If LLM didn't provide valid positions, default to entire block
        if (start === end || end === 0) {
          start = 0;
          end = contentLength;
        }
      }

      // Ensure end doesn't exceed content length
      end = Math.min(end, contentLength);

      return {
        blockIndex,
        severity: result.object.severity,
        start,
        end,
        comment: result.object.comment,
      };
    } catch (error) {
      console.error(`Error reviewing block ${blockIndex}:`, error);
      throw new Error(
        `Failed to review block ${blockIndex}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate a document summary based on all reviews
   */
  private async generateDocumentSummary(
    reviews: ContractBlockReview[],
    blocks: ContractBlock[],
    language: string = 'English'
  ): Promise<string> {
    const openrouterApiKey = this.env.OPENROUTER_API_KEY;

    if (!openrouterApiKey) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    try {
      // Create OpenRouter provider with AI SDK
      const openrouter = createOpenRouter({
        apiKey: openrouterApiKey,
      });

      // Count severity levels
      const severityCounts = {
        safe: reviews.filter(r => r.severity === "safe").length,
        medium: reviews.filter(r => r.severity === "medium").length,
        elevated: reviews.filter(r => r.severity === "elevated").length,
        high: reviews.filter(r => r.severity === "high").length,
      };

      // Get the top 3 most severe issues
      const highSeverityIssues = reviews
        .filter(r => r.severity === "high" || r.severity === "elevated")
        .sort((a, b) => {
          // Sort by severity first (high > elevated)
          const severityOrder = { high: 3, elevated: 2, medium: 1, safe: 0 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        })
        .slice(0, 3);

      // Prepare context for the LLM
      const issuesContext = highSeverityIssues.map((review, idx) => {
        const block = blocks[review.blockIndex];
        return `
Issue ${idx + 1} (Severity: ${review.severity}):
Section: ${block?.paragraph || "Unknown"}
Problem: ${review.comment}
Affected Text: "${block?.content.substring(review.start, review.end) || "N/A"}"
`;
      }).join("\n");

      // Define the schema for the summary
      const summarySchema = z.object({
        title: z
          .string()
          .describe("Short descriptive title identifying the document type (max 4-6 words), e.g. 'Commercial Lease Agreement', 'Software License Agreement', 'Employment Contract'"),
        overallEvaluation: z
          .string()
          .describe("Overall severity level: 'safe', 'medium', 'elevated', or 'high'"),
        summary: z
          .string()
          .describe("2-3 sentence summary of the document's overall risk profile"),
        keyIssues: z
          .array(z.object({
            shortSummary: z.string().describe("Brief 1-2 sentence summary of the issue"),
            issueIndex: z.number().describe("Index of the issue in the highSeverityIssues array (0-2)"),
          }))
          .length(3)
          .describe("Array of exactly 3 key issues with short summaries and indices to match with anchor links"),
      });

      // Use AI SDK's generateObject for structured output
      const result = await generateObject({
        model: openrouter("openai/gpt-5-mini"),
        schema: summarySchema,
        messages: [
          {
            role: "system",
            content: `You are a legal contract analyzer creating executive summaries. Based on the analysis of a contract document, provide:

1. A short, descriptive title (max 4-6 words) that identifies the document type clearly
   Examples: "Commercial Lease Agreement", "Software License Agreement", "Employment Contract", "Non-Disclosure Agreement"
   DO NOT include risk levels, issue counts, or compliance status in the title.

2. An overall evaluation determining the document's severity level:
   - "safe": No significant risks identified
   - "medium": Some minor concerns requiring attention
   - "elevated": Significant risks that need careful review
   - "high": Critical issues requiring immediate legal review

3. A 2-3 sentence summary of the overall risk profile

4. Exactly 3 key issues with:
   - A brief 1-2 sentence summary of each issue (not the full comment)
   - The index (0-2) matching the issue in the provided list

Be concise, clear, and actionable. Focus on the business impact of the identified risks.
All responses must be in ${language}.`,
          },
          {
            role: "user",
            content: `Analyze this contract review and create a summary:

**Document Statistics:**
- Total sections analyzed: ${reviews.length}
- Safe sections: ${severityCounts.safe}
- Medium risk sections: ${severityCounts.medium}
- Elevated risk sections: ${severityCounts.elevated}
- High risk sections: ${severityCounts.high}

**Top Severe Issues:**
${issuesContext}

Provide the overall evaluation (safe/medium/elevated/high), a brief summary, and exactly 3 key issues with their summaries and indices.`,
          },
        ],
      });

      // Create top concerns with anchor links
      const topConcerns = result.object.keyIssues.map((issue) => {
        const matchedIssue = highSeverityIssues[issue.issueIndex];
        const block = blocks[matchedIssue?.blockIndex];

        return {
          shortSummary: issue.shortSummary,
          anchorId: block?.anchorId || "",
          severity: matchedIssue?.severity || "medium",
        };
      });

      // Format the summary as a readable text with metadata
      const formattedSummary = JSON.stringify({
        title: result.object.title,
        overallEvaluation: result.object.overallEvaluation,
        summary: result.object.summary,
        topConcerns,
      });

      return formattedSummary;
    } catch (error) {
      console.error(`Error generating document summary:`, error);
      throw new Error(
        `Failed to generate document summary: ${
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
