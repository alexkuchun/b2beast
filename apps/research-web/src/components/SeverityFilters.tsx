"use client";

import { Severity } from '@/types/document';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Trans } from '@lingui/react/macro';
import { useLingui } from '@lingui/react';
import { msg } from '@lingui/core/macro';

interface SeverityFiltersProps {
  filters: Record<Severity, boolean>;
  onFilterChange: (severity: Severity, checked: boolean) => void;
  className?: string;
}

export function SeverityFilters({ filters, onFilterChange, className }: SeverityFiltersProps) {
  const { _ } = useLingui();

  const getSeverityLabel = (severity: Severity): string => {
    switch (severity) {
      case 'high':
        return _(msg`High`);
      case 'elevated':
        return _(msg`Elevated`);
      case 'medium':
        return _(msg`Medium`);
      case 'safe':
        return _(msg`Safe`);
    }
  };

  return (
    <div className={className}>
      <span className="text-sm text-muted-foreground mr-3"><Trans>Filters:</Trans></span>
      <div className="flex gap-4">
        {(Object.keys(filters) as Severity[]).map((severity) => (
          <div key={severity} className="flex items-center gap-2">
            <Checkbox
              id={`filter-${severity}`}
              checked={filters[severity]}
              onCheckedChange={(checked) => onFilterChange(severity, checked as boolean)}
            />
            <Label
              htmlFor={`filter-${severity}`}
              className="text-sm cursor-pointer"
            >
              {getSeverityLabel(severity)}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
