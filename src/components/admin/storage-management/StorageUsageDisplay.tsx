import React from 'react';
import { StorageUsage } from '@/lib/api/storage-management';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface StorageUsageDisplayProps {
  usage: StorageUsage;
  className?: string;
}

export function StorageUsageDisplay({ usage, className }: StorageUsageDisplayProps) {
  const getColorClass = (percent: number) => {
    if (percent < 70) return 'text-green-600';
    if (percent < 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (percent: number) => {
    if (percent < 70) return 'bg-green-500';
    if (percent < 85) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={cn("space-y-6", className)} dir="rtl">
      {/* Main Usage Display */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold mb-4">שימוש בדיסק</h3>
        
        {/* Circular Progress Indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative w-48 h-48">
            <svg className="transform -rotate-90 w-48 h-48">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="16"
                fill="none"
                className="text-slate-200"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="16"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - usage.usePercent / 100)}`}
                className={getColorClass(usage.usePercent)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={cn("text-4xl font-bold", getColorClass(usage.usePercent))}>
                  {usage.usePercent}%
                </div>
                <div className="text-sm text-slate-600 mt-1">מנוצל</div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Details */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-semibold text-slate-900">{usage.total}</div>
            <div className="text-sm text-slate-600">סה"כ</div>
          </div>
          <div>
            <div className={cn("text-2xl font-semibold", getColorClass(usage.usePercent))}>
              {usage.used}
            </div>
            <div className="text-sm text-slate-600">משומש</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-green-600">{usage.available}</div>
            <div className="text-sm text-slate-600">זמין</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <Progress 
            value={usage.usePercent} 
            className={cn("h-3", getProgressColor(usage.usePercent))}
          />
        </div>
      </div>

      {/* Warning Message */}
      {usage.usePercent >= 85 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-red-800 font-medium">
              אזהרה: השימוש בדיסק עולה על 85%. מומלץ לנקות קבצים מיותרים.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


