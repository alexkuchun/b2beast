export type ContractBlock = {
  paragraph: string;
  content: string;
  pageNumber: number;
  anchorId?: string; // Unique anchor ID for linking
};

export type ContractBlockReview = {
  blockIndex: number;
  severity: "safe" | "medium" | "elevated" | "high";
  start: number;
  end: number;
  comment: string;
};
