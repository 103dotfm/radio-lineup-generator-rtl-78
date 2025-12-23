import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StorageWarningProps {
  usagePercent: number;
  className?: string;
}

export function StorageWarning({ usagePercent, className }: StorageWarningProps) {
  const navigate = useNavigate();

  if (usagePercent < 85) {
    return null;
  }

  return (
    <div className={cn(
      "bg-red-50 border border-red-200 rounded-lg p-4 mb-6",
      className
    )} dir="rtl">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-red-800">
              אזהרת אחסון
            </h3>
            <div className="text-2xl font-bold text-red-600">
              {usagePercent}%
            </div>
          </div>
          <p className="text-sm text-red-700 mb-3">
            השימוש בדיסק עולה על 85%. מומלץ לנקות קבצים מיותרים כדי למנוע בעיות.
          </p>
          <Button
            onClick={() => navigate('/admin?section=storage')}
            variant="outline"
            size="sm"
            className="bg-white hover:bg-red-50 border-red-300 text-red-800"
          >
            <HardDrive className="h-4 w-4 ml-2" />
            ניהול אחסון
          </Button>
        </div>
      </div>
    </div>
  );
}


