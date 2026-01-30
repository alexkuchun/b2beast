"use client";

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Doc, Severity } from '@/types/document';
import { Loader2, AlertCircle, Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SeverityControl } from './SeverityControl';
import { BlocksRenderer } from './BlocksRenderer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trans } from '@lingui/react/macro';
import { useLingui } from '@lingui/react';
import { msg } from '@lingui/core/macro';
import { type Locale } from '@/lib/i18n';

interface DocumentViewerProps {
  document: Doc | undefined;
  documents: Doc[];
  onDocumentSelect: (docId: string) => void;
  onRetry: (docId: string) => void;
}

export function DocumentViewer({ document, documents, onDocumentSelect, onRetry }: DocumentViewerProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as Locale;
  const { _ } = useLingui();
  const [filters, setFilters] = useState<Record<Severity, boolean>>({
    high: true,
    elevated: false,
    medium: false,
    safe: false
  });

  const handleFilterChange = (severity: Severity, checked: boolean) => {
    setFilters(prev => ({ ...prev, [severity]: checked }));
  };

  const filteredReviews = useMemo(() => {
    if (!document?.result) return [];
    return document.result.reviews.filter(r => filters[r.severity]);
  }, [document?.result, filters]);

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <FileText className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">
            <Trans>No Document Selected</Trans>
          </h2>
          <p className="text-muted-foreground mb-6">
            <Trans>Select a document from the sidebar to view its analysis, or create a new workflow to upload a document</Trans>
          </p>
          <Button
            size="lg"
            onClick={() => router.push(`/${locale}/new`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            <Trans>Create New Workflow</Trans>
          </Button>
        </div>
      </div>
    );
  }

  if (document.status === 'processing') {
    const stageName = document.currentStage === 'parsing' ? _(msg`Parsing Document`) :
                      document.currentStage === 'reviewing' ? _(msg`Reviewing Risks`) :
                      document.currentStage === 'summarizing' ? _(msg`Generating Summary`) :
                      _(msg`Processing Document`);
    const progress = document.progress || 0;

    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md w-full">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">{stageName}</h3>
          <p className="text-muted-foreground mb-4">
            {document.currentStage === 'parsing' && <Trans>Extracting text and structure from your contract...</Trans>}
            {document.currentStage === 'reviewing' && <Trans>Analyzing clauses for potential risks...</Trans>}
            {document.currentStage === 'summarizing' && <Trans>Creating document risk summary...</Trans>}
            {!document.currentStage && <Trans>Analyzing contract for potential risks...</Trans>}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-muted-foreground">
            {progress}% <Trans>complete</Trans>
          </p>
        </div>
      </div>
    );
  }

  if (document.status === 'error') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="p-6 max-w-md">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-severity-high flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">
                <Trans>Processing Error</Trans>
              </h3>
              <p className="text-muted-foreground mb-4">
                {document.errorMessage || _(msg`An error occurred while processing the document.`)}
              </p>
              <Button onClick={() => onRetry(document.id)}>
                <Trans>Retry Processing</Trans>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-8">
          <SeverityControl
            filters={filters}
            onFilterChange={handleFilterChange}
            reviews={document.result?.reviews || []}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {document.result && (
          <div className="max-w-4xl mx-auto">
            <Card className="p-6 mb-6 bg-primary/5 border-primary/20">
              <h3 className="text-sm font-semibold mb-3 text-primary">
                <Trans>Document Risk Summary</Trans>
              </h3>
              {(() => {
                try {
                  const summaryData = typeof document.result.summary === 'string'
                    ? JSON.parse(document.result.summary)
                    : document.result.summary;

                  const handleConcernClick = (anchorId: string) => {
                    const element = window.document.getElementById(anchorId);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      // Add highlight animation
                      element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
                      setTimeout(() => {
                        element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
                      }, 2000);
                    }
                  };

                  return (
                    <>
                      <div className="text-sm leading-relaxed mb-4">
                        <div className="font-semibold mb-1">
                          <Trans>Overall Risk Evaluation</Trans>: {summaryData.overallEvaluation?.toUpperCase() || 'N/A'}
                        </div>
                        <p>{summaryData.summary}</p>
                      </div>

                      {summaryData.topConcerns && summaryData.topConcerns.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold mb-2">
                            <Trans>Top 3 Concerns</Trans>:
                          </h4>
                          <ul className="space-y-2">
                            {summaryData.topConcerns.map((concern: any, idx: number) => (
                              <li key={idx}>
                                <button
                                  onClick={() => handleConcernClick(concern.anchorId)}
                                  className="text-left w-full hover:bg-primary/10 p-2 rounded transition-colors"
                                >
                                  <span
                                    className="inline-block w-2 h-2 rounded-full mr-2"
                                    style={{
                                      backgroundColor:
                                        concern.severity === 'high' ? '#ef4444' :
                                        concern.severity === 'elevated' ? '#f59e0b' :
                                        concern.severity === 'medium' ? '#eab308' : '#22c55e'
                                    }}
                                  />
                                  <span className="text-sm">{concern.shortSummary}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  );
                } catch {
                  // Fallback for old format
                  return (
                    <div className="text-sm leading-relaxed whitespace-pre-line">
                      {document.result.summary}
                    </div>
                  );
                }
              })()}
            </Card>

            <Card className="p-8">
              <div className="space-y-2">
                <BlocksRenderer
                  blocks={document.result.blocks}
                  reviews={filteredReviews}
                  filters={filters}
                />
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
