/**
 * Antihal Client - Interfaces with the research-antihal service
 * for hallucination detection and risk assessment
 */

export interface AntihalRequest {
  prompt: string;
}

export interface AntihalResponse {
  hallucination_risk: number;
  isr: number;
  info_budget: number;
}

export interface AntihalError {
  error: string;
  detail?: string;
}

/**
 * Call the antihal service to estimate hallucination risk for a given prompt
 *
 * @param antihalUrl - Base URL of the antihal service (e.g., http://localhost:8000)
 * @param prompt - The text prompt to analyze for hallucination risk
 * @returns Promise with hallucination metrics
 * @throws Error if the request fails or antihal service is unavailable
 */
export async function estimateHallucinationRisk(
  antihalUrl: string,
  prompt: string
): Promise<AntihalResponse> {
  if (!antihalUrl) {
    throw new Error("ANTIHAL_URL is not configured");
  }

  // Ensure URL doesn't have trailing slash
  const baseUrl = antihalUrl.endsWith("/") ? antihalUrl.slice(0, -1) : antihalUrl;
  const endpoint = `${baseUrl}/api/hallucinations/estimate`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as AntihalError;
      throw new Error(
        `Antihal service error (${response.status}): ${errorData.error || errorData.detail || "Unknown error"}`
      );
    }

    const data = await response.json() as AntihalResponse;

    // Validate response structure
    if (
      typeof data.hallucination_risk !== "number" ||
      typeof data.isr !== "number" ||
      typeof data.info_budget !== "number"
    ) {
      throw new Error("Invalid response structure from antihal service");
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw if it's already a formatted error
      if (error.message.includes("Antihal service error")) {
        throw error;
      }
      // Wrap network/fetch errors
      throw new Error(`Failed to connect to antihal service: ${error.message}`);
    }
    throw new Error("Unknown error occurred while calling antihal service");
  }
}

/**
 * Check if the antihal service is healthy and available
 *
 * @param antihalUrl - Base URL of the antihal service
 * @returns Promise<boolean> - true if service is healthy, false otherwise
 */
export async function checkAntihalHealth(antihalUrl: string): Promise<boolean> {
  if (!antihalUrl) {
    return false;
  }

  const baseUrl = antihalUrl.endsWith("/") ? antihalUrl.slice(0, -1) : antihalUrl;
  const endpoint = `${baseUrl}/health`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json() as { status: string; service: string };
    return data.status === "healthy" && data.service === "research-antihal";
  } catch {
    return false;
  }
}
