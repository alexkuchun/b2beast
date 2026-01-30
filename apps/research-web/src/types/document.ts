export type Severity = 'high' | 'elevated' | 'medium' | 'safe';

export type ContractBlock = {
  paragraph: string;
  content: string;
  pageNumber: number;
  anchorId?: string; // Unique anchor ID for linking
};

export type ContractReview = {
  id: string;
  paragraphId: number; // index of the paragraph in blocks array
  severity: Severity;
  comment: string;
  category?: string;
};

export type TopConcern = {
  shortSummary: string; // Brief 1-2 sentence summary
  anchorId: string; // Link to the paragraph
  severity: Severity;
};

export type Result = {
  blocks: ContractBlock[];
  summary: string;
  reviews: ContractReview[];
  topConcerns?: TopConcern[]; // Top 3 concerns with anchor links
};

export type DocStatus = 'uploaded' | 'processing' | 'done' | 'error';

export type Doc = {
  id: string;
  name: string; // Original filename (contractName)
  title?: string | null; // AI-generated descriptive title in user's language
  size: number;
  createdAt: number;
  status: DocStatus;
  result?: Result;
  errorMessage?: string;
  currentStage?: string;
  progress?: number;
};
