
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface PrintPreviewProps {
  showName: string;
  showTime: string;
  showDate: Date | undefined;
  items: any[];
  editorContent: string;
  showMinutes?: boolean;
}

const PrintPreview = ({
  showName,
  showTime,
  showDate,
  items,
  editorContent,
  showMinutes = false
}: PrintPreviewProps) => {
  const formattedDate = useMemo(() => {
    if (!showDate) return '';
    return format(showDate, 'EEEE, d בMMMM yyyy', { locale: he });
  }, [showDate]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    return items
      .filter(item => !item.is_divider) // Skip dividers in duration calculation
      .reduce((total, item) => total + (item.duration || 0), 0);
  }, [items]);

  return (
    <div className="p-8 max-w-3xl mx-auto bg-white shadow-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">{showName}</h1>
        <div className="text-lg">
          {formattedDate} | {showTime}
        </div>
      </div>

      <table className="w-full border-collapse mb-8">
        <thead>
          <tr className="border-b border-gray-300">
            {showMinutes && <th className="pb-2 text-right w-16">דקות</th>}
            <th className="pb-2 text-right">פריט</th>
            {!showMinutes && <th className="pb-2 text-right w-24"></th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            item.is_divider ? (
              <tr key={item.id} className="border-t border-gray-200">
                <td colSpan={showMinutes ? 2 : 2} className="py-3 bg-gray-100 font-bold text-center">
                  {item.name}
                </td>
              </tr>
            ) : (
              <tr key={item.id} className="border-t border-gray-200">
                {showMinutes && (
                  <td className="py-3 text-right align-top">{item.duration}</td>
                )}
                <td className="py-3">
                  <div className="font-bold">{item.name}</div>
                  {item.title && !item.is_break && (
                    <div className="text-gray-600">{item.title}</div>
                  )}
                  {item.details && !item.is_break && !item.is_note && (
                    <div className="mt-2 text-sm" dangerouslySetInnerHTML={{ __html: item.details }} />
                  )}
                  {item.is_note && (
                    <div className="mt-2 text-sm italic" dangerouslySetInnerHTML={{ __html: item.details }} />
                  )}
                </td>
                {!showMinutes && (
                  <td className="py-3 text-right align-top">{item.duration}</td>
                )}
              </tr>
            )
          ))}
          <tr className="border-t border-gray-300">
            <td colSpan={showMinutes ? 2 : 2} className="pt-2 text-right">
              <strong>סה״כ: {totalDuration} דקות</strong>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="text-sm mt-4" dangerouslySetInnerHTML={{ __html: editorContent }} />
    </div>
  );
};

export default PrintPreview;
