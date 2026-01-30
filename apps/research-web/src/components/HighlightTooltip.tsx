"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Severity } from "@/types/document";
import { useLingui } from "@lingui/react";
import { msg } from "@lingui/core/macro";

interface ReviewInfo {
  severity: Severity;
  comment: string;
  category?: string;
}

interface HighlightTooltipProps {
  finding: ReviewInfo;
  children: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const severityColors = {
  high: "border-severity-high bg-red-50 dark:bg-red-950",
  elevated: "border-severity-elevated bg-orange-50 dark:bg-orange-950",
  medium: "border-severity-medium bg-yellow-50 dark:bg-yellow-950",
  safe: "border-severity-safe bg-green-50 dark:bg-green-950",
};

export function HighlightTooltip({
  finding,
  children,
  isOpen,
  onOpenChange,
}: HighlightTooltipProps) {
  const { _ } = useLingui();

  const getSeverityLabel = (severity: Severity): string => {
    switch (severity) {
      case 'high':
        return _(msg`HIGH RISK`);
      case 'elevated':
        return _(msg`ELEVATED RISK`);
      case 'medium':
        return _(msg`MEDIUM RISK`);
      case 'safe':
        return _(msg`LOW RISK`);
    }
  };

  return (
    <>
      <div onClick={() => onOpenChange?.(true)} className="cursor-pointer">
        {children}
      </div>

      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "max-w-2xl max-h-[80vh] border-2 shadow-xl flex flex-col",
            severityColors[finding.severity]
          )}
        >
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <DialogTitle className="text-xs font-bold tracking-wide">
                  {getSeverityLabel(finding.severity)}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                {finding.category && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {finding.category}
                  </span>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2">
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {finding.comment}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
