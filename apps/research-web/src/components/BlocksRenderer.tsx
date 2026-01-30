"use client";

import React, { useState } from 'react';
import { ContractBlock, ContractReview, Severity } from '@/types/document';
import { HighlightTooltip } from '@/components/HighlightTooltip';
import ReactMarkdown from 'react-markdown';
import { useLingui } from '@lingui/react';
import { msg } from '@lingui/core/macro';

interface BlockWithReviewProps {
  block: ContractBlock;
  review: ContractReview | undefined;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function BlockWithReview({ block, review, isOpen, onOpenChange }: BlockWithReviewProps) {
  const { _ } = useLingui();

  if (!review) {
    // No review for this block, render markdown normally
    return (
      <div
        id={block.anchorId}
        className="mb-4 prose prose-sm max-w-none dark:prose-invert scroll-mt-20"
      >
        <ReactMarkdown>
          {block.content}
        </ReactMarkdown>
      </div>
    );
  }

  // Block has a review, wrap in highlight tooltip
  return (
    <div id={block.anchorId} className="scroll-mt-20">
      <HighlightTooltip
        finding={{
          // id: review.id,
          // start: 0,
          // end: 0,
          severity: review.severity,
          comment: review.comment,
          category: review.category,
        }}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      >
        <div className="mb-4">
          <mark
            data-severity={review.severity}
            tabIndex={0}
            aria-label={_(msg`${review.severity} severity: ${review.category || 'issue'}`)}
            className="block rounded p-3 cursor-pointer"
          >
            <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>
              {block.content}
            </ReactMarkdown>
            </div>
          </mark>
        </div>
      </HighlightTooltip>
    </div>
  );
}

interface BlocksRendererProps {
  blocks: ContractBlock[];
  reviews: ContractReview[];
  filters: Record<Severity, boolean>;
}

export function BlocksRenderer({ blocks, reviews, filters }: BlocksRendererProps) {
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  // Create a map of paragraph index to review
  const reviewMap = new Map<number, ContractReview>();
  reviews.forEach(review => {
    if (filters[review.severity]) {
      reviewMap.set(review.paragraphId, review);
    }
  });

  return (
    <>
      {blocks.map((block, idx) => {
        const review = reviewMap.get(idx);
        return (
          <BlockWithReview
            key={idx}
            block={block}
            review={review}
            isOpen={openPopoverId === review?.id}
            onOpenChange={(open) => setOpenPopoverId(open ? review?.id || null : null)}
          />
        );
      })}
    </>
  );
}
