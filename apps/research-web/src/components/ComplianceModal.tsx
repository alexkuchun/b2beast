"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, AlertCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { msg } from "@lingui/core/macro";

interface ComplianceResult {
  phase2?: Array<{
    contractBlockIndex: number;
    articleName: string;
    articleTitle: string;
    source: "BGB" | "HGB";
    severity: "safe" | "minor" | "moderate" | "critical";
    violationDetails: string;
    recommendation: string;
  }>;
  summary?: {
    totalBlocks: number;
    blocksWithViolations: number;
    criticalViolations: number;
    moderateViolations: number;
    minorViolations: number;
  };
}

interface ComplianceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStage?: string;
  progress?: number;
  complianceResults?: ComplianceResult;
  status?: string;
  onBlockClick?: (blockIndex: number) => void;
}

// Map backend severity to frontend severity
const mapSeverity = (severity: "safe" | "minor" | "moderate" | "critical") => {
  switch (severity) {
    case "critical":
      return "high";
    case "moderate":
      return "elevated";
    case "minor":
      return "medium";
    case "safe":
    default:
      return "safe";
  }
};

// Severity config uses keys that will be translated in the component
const severityConfig = {
  high: {
    labelKey: "CRITICAL",
    icon: XCircle,
    bgClass: "border-severity-high bg-red-50 dark:bg-red-950",
    textClass: "text-red-900 dark:text-red-100",
    badgeClass: "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100",
  },
  elevated: {
    labelKey: "MODERATE",
    icon: AlertTriangle,
    bgClass: "border-severity-elevated bg-orange-50 dark:bg-orange-950",
    textClass: "text-orange-900 dark:text-orange-100",
    badgeClass: "bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100",
  },
  medium: {
    labelKey: "MINOR",
    icon: AlertCircle,
    bgClass: "border-severity-medium bg-yellow-50 dark:bg-yellow-950",
    textClass: "text-yellow-900 dark:text-yellow-100",
    badgeClass: "bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100",
  },
  safe: {
    labelKey: "SAFE",
    icon: CheckCircle2,
    bgClass: "border-severity-safe bg-green-50 dark:bg-green-950",
    textClass: "text-green-900 dark:text-green-100",
    badgeClass: "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100",
  },
};

export function ComplianceModal({
  open,
  onOpenChange,
  currentStage,
  progress = 0,
  complianceResults,
  status,
  onBlockClick,
}: ComplianceModalProps) {
  const { _ } = useLingui();
  const isProcessing = status === "in_progress" || status === "pending";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <SheetTitle><Trans>Legal Compliance Review</Trans></SheetTitle>
          <SheetDescription>
            <Trans>Analysis of contract clauses against German commercial law (HGB)</Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Status Section */}
          {isProcessing && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      <Trans>Analyzing contract...</Trans>
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {currentStage === "identifying_articles" && <Trans>Identifying relevant legal articles</Trans>}
                      {currentStage === "deep_analysis" && <Trans>Performing detailed compliance analysis</Trans>}
                      {!currentStage && <Trans>Starting compliance check</Trans>}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {progress}%
                  </span>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 border-t border-blue-200 dark:border-blue-800 pt-3">
                  <Trans>This comprehensive analysis can take up to 8 minutes to complete.</Trans>
                </div>
              </CardContent>
            </Card>
          )}

          {isFailed && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <p className="font-medium text-red-900 dark:text-red-100">
                    <Trans>Compliance check failed. Please try again.</Trans>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Section */}
          {complianceResults?.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg"><Trans>Summary</Trans></CardTitle>
                <CardDescription><Trans>Overview of compliance findings</Trans></CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold">
                      {complianceResults.summary.totalBlocks}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <Trans>Clauses Analyzed</Trans>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {complianceResults.summary.criticalViolations}
                    </div>
                    <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                      <Trans>Critical Issues</Trans>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {complianceResults.summary.moderateViolations}
                    </div>
                    <div className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      <Trans>Moderate Issues</Trans>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      {complianceResults.summary.minorViolations}
                    </div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      <Trans>Minor Issues</Trans>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Section */}
          {complianceResults?.phase2 && complianceResults.phase2.length > 0 ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-1"><Trans>Compliance Findings</Trans></h3>
                <p className="text-sm text-muted-foreground">
                  <Trans>Detailed analysis of {complianceResults.phase2.length} identified issues</Trans>
                </p>
              </div>

              {complianceResults.phase2.map((result, idx) => {
                const mappedSeverity = mapSeverity(result.severity);
                const config = severityConfig[mappedSeverity as keyof typeof severityConfig];
                const Icon = config.icon;

                // Translate severity label
                const getSeverityLabel = (labelKey: string) => {
                  switch (labelKey) {
                    case "CRITICAL":
                      return _(msg`CRITICAL`);
                    case "MODERATE":
                      return _(msg`MODERATE`);
                    case "MINOR":
                      return _(msg`MINOR`);
                    case "SAFE":
                      return _(msg`SAFE`);
                    default:
                      return labelKey;
                  }
                };

                return (
                  <Card
                    key={idx}
                    className={cn("border-2", config.bgClass)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className={config.badgeClass}>
                              {result.source}
                            </Badge>
                            <span className={cn("text-sm font-semibold", config.textClass)}>
                              {result.articleName}
                            </span>
                          </div>
                          <CardTitle className={cn("text-base", config.textClass)}>
                            {result.articleTitle}
                          </CardTitle>
                          <CardDescription className={cn("mt-1", config.textClass, "opacity-70")}>
                            <Trans>Contract Block #{result.contractBlockIndex}</Trans>
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-5 w-5", config.textClass)} />
                            <span className={cn("text-xs font-bold uppercase", config.textClass)}>
                              {getSeverityLabel(config.labelKey)}
                            </span>
                          </div>
                          {onBlockClick && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                onBlockClick(result.contractBlockIndex);
                                onOpenChange(false);
                              }}
                              className={cn(
                                "h-7 text-xs gap-1",
                                config.textClass,
                                "hover:bg-white/20 dark:hover:bg-black/20"
                              )}
                            >
                              <ExternalLink className="h-3 w-3" />
                              <Trans>View in Contract</Trans>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className={cn("text-sm font-semibold mb-2", config.textClass)}>
                          <Trans>Issue Details</Trans>
                        </h4>
                        <div className={cn("text-sm leading-relaxed prose prose-sm max-w-none", config.textClass, "opacity-90")}>
                          <ReactMarkdown>
                            {result.violationDetails}
                          </ReactMarkdown>
                        </div>
                      </div>
                      <div>
                        <h4 className={cn("text-sm font-semibold mb-2", config.textClass)}>
                          <Trans>Recommendation</Trans>
                        </h4>
                        <div className={cn("text-sm leading-relaxed prose prose-sm max-w-none", config.textClass, "opacity-90")}>
                          <ReactMarkdown>
                            {result.recommendation}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            !isProcessing && !isFailed && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    {isCompleted
                      ? <Trans>No compliance issues found. All clauses appear to be compliant.</Trans>
                      : <Trans>No compliance results available yet.</Trans>}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
