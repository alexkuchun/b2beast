"use client";

import { Severity } from '@/types/document';
import { Trans } from '@lingui/react/macro';
import { useLingui } from '@lingui/react';
import { msg } from '@lingui/core/macro';

interface SeverityLegendProps {
  className?: string;
}

const severityConfig = {
  high: { labelKey: 'high', color: 'bg-severity-high' },
  elevated: { labelKey: 'elevated', color: 'bg-severity-elevated' },
  medium: { labelKey: 'medium', color: 'bg-severity-medium' },
  safe: { labelKey: 'safe', color: 'bg-severity-safe' }
};

export function SeverityLegend({ className }: SeverityLegendProps) {
  const { _ } = useLingui();

  const getSeverityLabel = (key: string): string => {
    switch (key) {
      case 'high':
        return _(msg`High`);
      case 'elevated':
        return _(msg`Elevated`);
      case 'medium':
        return _(msg`Medium`);
      case 'safe':
        return _(msg`Safe`);
      default:
        return key;
    }
  };

  return (
    <div className={className}>
      <span className="text-sm text-muted-foreground mr-3"><Trans>Legend:</Trans></span>
      <div className="flex gap-4">
        {Object.entries(severityConfig).map(([severity, config]) => (
          <div key={severity} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${config.color}`} />
            <span className="text-sm">{getSeverityLabel(config.labelKey)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
