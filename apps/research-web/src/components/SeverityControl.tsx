"use client";

import { Severity, ContractReview } from '@/types/document';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useMemo } from 'react';
import { useLingui } from '@lingui/react';
import { msg } from '@lingui/core/macro';

interface SeverityControlProps {
  filters: Record<Severity, boolean>;
  onFilterChange: (severity: Severity, checked: boolean) => void;
  reviews: ContractReview[];
  className?: string;
}

const severityConfig = {
  high: { labelKey: 'high', color: 'bg-severity-high' },
  elevated: { labelKey: 'elevated', color: 'bg-severity-elevated' },
  medium: { labelKey: 'medium', color: 'bg-severity-medium' },
  safe: { labelKey: 'safe', color: 'bg-severity-safe' }
};

export function SeverityControl({ filters, onFilterChange, reviews, className }: SeverityControlProps) {
  const { _ } = useLingui();

  const getSeverityLabel = (key: string): string => {
    switch (key) {
      case 'high':
        return _(msg`High Risk`);
      case 'elevated':
        return _(msg`Elevated Risk`);
      case 'medium':
        return _(msg`Medium Risk`);
      case 'safe':
        return _(msg`Low Risk`);
      default:
        return key;
    }
  };

  const counts = useMemo(() => {
    const result: Record<Severity, number> = {
      high: 0,
      elevated: 0,
      medium: 0,
      safe: 0
    };

    reviews.forEach(review => {
      result[review.severity]++;
    });

    return result;
  }, [reviews]);

  return (
    <div className={className}>
      <div className="flex gap-6">
        {(Object.entries(severityConfig) as [Severity, typeof severityConfig[Severity]][]).map(([severity, config]) => (
          <div key={severity} className="flex items-center gap-2">
            <Checkbox
              id={`severity-${severity}`}
              checked={filters[severity]}
              onCheckedChange={(checked) => onFilterChange(severity, checked as boolean)}
            />
            <Label
              htmlFor={`severity-${severity}`}
              className="text-sm cursor-pointer flex items-center gap-2"
            >
              <div className={`w-3 h-3 rounded ${config.color}`} />
              <span className="font-medium">{getSeverityLabel(config.labelKey)}</span>
              <span className="text-muted-foreground">({counts[severity]})</span>
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
