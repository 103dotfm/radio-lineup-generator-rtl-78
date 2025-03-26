
import React from 'react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { getNextShow } from '@/lib/getNextShow';

interface NextShowCreditsProps {
  showDate: Date;
  showTime: string;
}

const NextShowCredits: React.FC<NextShowCreditsProps> = ({ showDate, showTime }) => {
  const [nextShow, setNextShow] = useState<{ name: string; host?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchNextShow() {
      try {
        setIsLoading(true);
        const nextShowInfo = await getNextShow(showDate, showTime);
        setNextShow(nextShowInfo);
      } catch (error) {
        console.error('Error fetching next show:', error);
        setNextShow(null);
      } finally {
        setIsLoading(false);
      }
    }

    if (showDate && showTime) {
      fetchNextShow();
    }
  }, [showDate, showTime]);

  if (isLoading) {
    return <div className="text-xs opacity-70 italic">טוען תוכנית הבאה...</div>;
  }

  if (!nextShow) {
    return null;
  }

  return (
    <div className="mt-3 border-t pt-2 dark:border-gray-700 text-sm">
      <div className="font-medium">בהמשך היום: {nextShow.name}</div>
      {nextShow.host && (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          בהגשת {nextShow.host}
        </div>
      )}
    </div>
  );
};

export default NextShowCredits;
