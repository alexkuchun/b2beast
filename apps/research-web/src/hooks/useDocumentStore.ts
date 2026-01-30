import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Doc, DocStatus } from '@/types/document';
import { uploadContract, getResearchStatus, getAllResearch } from '@/app/actions/research';
import { getPdfPageCount } from '@/utils/pdfHelpers';

export function useDocumentStore() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Poll for document status
  const pollDocumentStatus = useCallback((docId: string, researchId: string) => {
    // Clear existing interval if any
    const existingInterval = pollingIntervals.current.get(docId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    const interval = setInterval(async () => {
      const result = await getResearchStatus(researchId);

      if (result.success && result.data) {
        const research = result.data;

        setDocuments(prev => prev.map(doc => {
          if (doc.id === docId) {
            // Check if completed
            if (research.status === 'completed') {
              clearInterval(interval);
              pollingIntervals.current.delete(docId);

              // Parse results
              const parsedResults = research.results ? JSON.parse(research.results) : null;

              return {
                ...doc,
                status: 'done' as DocStatus,
                result: parsedResults ? {
                  blocks: parsedResults.blocks,
                  reviews: parsedResults.reviews.map((review: any, idx: number) => ({
                    id: `review-${idx}`,
                    paragraphId: review.blockIndex,
                    severity: review.severity,
                    comment: review.comment,
                  })),
                  summary: research.summary || `Analysis completed with ${parsedResults.totalBlocks} blocks reviewed.`
                } : undefined
              };
            }

            // Check if failed
            if (research.status === 'failed') {
              clearInterval(interval);
              pollingIntervals.current.delete(docId);

              return {
                ...doc,
                status: 'error' as DocStatus,
                errorMessage: research.errorMessage || 'Failed to process document'
              };
            }

            // Still processing - update stage
            return {
              ...doc,
              status: 'processing' as DocStatus,
            };
          }
          return doc;
        }));
      }
    }, 3000); // Poll every 3 seconds

    pollingIntervals.current.set(docId, interval);
  }, []);

  const addDocument = useCallback(async (file: File) => {
    try {
      // Get page count from PDF
      const pageCount = await getPdfPageCount(file);

      // Create form data
      const formData = new FormData();
      formData.append('contractName', file.name);
      formData.append('file', file);
      formData.append('totalPages', pageCount.toString());

      // Upload contract
      const result = await uploadContract(formData);

      if (!result.success || !result.data) {
        console.error('Upload failed:', result.error);
        return null;
      }

      // Redirect to the research detail page
      router.push(`/research/${result.data.research.id}`);

      return result.data.research.id;

    } catch (error) {
      console.error('Error uploading document:', error);
      return null;
    }
  }, [router]);

  const retryDocument = useCallback((docId: string) => {
    // For retry, we would need to store the original file
    // For now, just show an error message
    setDocuments(prev => prev.map(doc =>
      doc.id === docId
        ? {
            ...doc,
            status: 'error' as DocStatus,
            errorMessage: 'Retry not implemented. Please re-upload the document.'
          }
        : doc
    ));
  }, []);

  // Fetch documents on mount
  const fetchDocuments = useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setIsLoading(true);
      }
      const result = await getAllResearch();

      if (result.success && result.data) {
        // Convert research records to Doc format
        const docs: Doc[] = result.data.map((research: any) => ({
          id: research.id,
          name: research.contractName,
          title: research.title, // AI-generated title (may be null during processing)
          size: 0, // Size not available from API
          createdAt: new Date(research.createdAt).getTime(),
          status: research.status === 'completed' ? 'done' as DocStatus :
                  research.status === 'failed' ? 'error' as DocStatus :
                  research.status === 'in_progress' ? 'processing' as DocStatus :
                  'uploaded' as DocStatus,
          errorMessage: research.errorMessage,
          result: research.results ? JSON.parse(research.results) : undefined
        }));

        setDocuments(docs);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, []);

  // Fetch documents on mount and refresh every 10 seconds
  useEffect(() => {
    fetchDocuments(true); // Initial load with loading state
    const interval = setInterval(() => fetchDocuments(false), 10000); // Subsequent fetches without loading state

    return () => clearInterval(interval);
  }, [fetchDocuments]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      pollingIntervals.current.forEach(interval => clearInterval(interval));
      pollingIntervals.current.clear();
    };
  }, []);

  const currentDocument = documents.find(d => d.id === currentDocId);

  return {
    documents,
    currentDocument,
    currentDocId,
    isLoading,
    setCurrentDocId,
    addDocument,
    retryDocument,
    refreshDocuments: fetchDocuments
  };
}
