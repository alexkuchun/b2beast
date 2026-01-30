import { auth } from '@clerk/nextjs/server';

/**
 * Get authenticated user ID from Clerk
 * Returns userId if authenticated, throws error otherwise
 */
export async function getAuthUserId(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized: Please sign in');
  }

  return userId;
}

/**
 * Helper type for server action responses
 */
export type ServerActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Wrapper for server actions that require authentication
 * Automatically handles auth check and error responses
 */
export async function withAuth<T>(
  handler: (userId: string) => Promise<T>
): Promise<ServerActionResponse<T>> {
  try {
    const userId = await getAuthUserId();
    const data = await handler(userId);
    return { success: true, data };
  } catch (error) {
    console.error('Server action error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred'
    };
  }
}
