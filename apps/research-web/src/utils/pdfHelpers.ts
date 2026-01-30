/**
 * PDF processing utilities for client-side page detection
 */

// Lazy load PDF.js to reduce initial bundle size
let pdfJsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

/**
 * Load PDF.js dynamically
 */
async function loadPdfJs(): Promise<typeof import('pdfjs-dist')> {
  console.log('Loading PDF.js...');
  if (!pdfJsPromise) {
    pdfJsPromise = import('pdfjs-dist').then((pdfjs) => {
      console.log('PDF.js loaded, configuring worker...');

      // Set a fixed version for the worker - must match your installed PDF.js version
      // This is the most reliable approach for Next.js
      // Use jsdelivr CDN which is more reliable than unpkg
      const PDF_WORKER_URL =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.2.133/build/pdf.worker.min.mjs';

      // Set the worker source directly
      pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
      console.log('PDF.js worker configured with fixed CDN URL');

      return pdfjs;
    });
  }
  return pdfJsPromise;
}

/**
 * Get the number of pages in a PDF file using PDF.js
 */
export async function getPdfPageCount(file: File): Promise<number> {
  try {
    // Load PDF.js
    const pdfjs = await loadPdfJs();

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Load the PDF document
    const loadingTask = pdfjs.getDocument(data);
    const pdf = await loadingTask.promise;

    // Return the number of pages
    return pdf.numPages;
  } catch (error) {
    console.error('Error counting PDF pages:', error);
    // Default to 1 page if we can't determine
    return 1;
  }
}
