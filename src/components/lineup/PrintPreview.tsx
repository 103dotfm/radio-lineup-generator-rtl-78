import React from 'react';
import { format } from 'date-fns';

interface PrintPreviewProps {
  showName: string;
  showTime: string;
  showDate?: Date;
  items: Array<{
    id: string;
    name: string;
    title: string;
    details: string;
    phone: string;
    duration: number;
    isBreak?: boolean;
  }>;
  editorContent: string;
}

const PrintPreview = ({ showName, showTime, showDate, items, editorContent }: PrintPreviewProps) => {
  return (
    <div className="print-content text-sm">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold pb-2">{showName}</h1>
        <h2 className="text-lg text-gray-600 mt-2 pb-2">
          {showTime} {showDate ? format(showDate, 'dd/MM/yyyy') : ''}
        </h2>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="py-2 px-3 text-right border border-gray-200">שם</th>
            <th className="py-2 px-3 text-right border border-gray-200">כותרת</th>
            <th className="py-2 px-3 text-right border border-gray-200">פרטים</th>
            <th className="py-2 px-3 text-right border border-gray-200">טלפון</th>
            <th className="py-2 px-3 text-right border border-gray-200">דקות</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            item.isBreak ? (
              <tr key={item.id} className="bg-gray-100 print:bg-gray-100">
                <td colSpan={5} className="py-2 px-3 text-center border border-gray-200 bg-gray-100 print:bg-gray-100">
                  <div className="flex items-center justify-center">
                    {item.name} - {item.duration} דקות
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={item.id}>
                <td className="py-2 px-3 border border-gray-200">{item.name}</td>
                <td className="py-2 px-3 border border-gray-200">{item.title}</td>
                <td className="py-2 px-3 border border-gray-200 whitespace-pre-line">{item.details}</td>
                <td className="py-2 px-3 border border-gray-200">{item.phone}</td>
                <td className="py-2 px-3 border border-gray-200">{item.duration} דקות</td>
              </tr>
            )
          ))}
        </tbody>
      </table>

      <div className="mt-4 text-left text-sm">
        <p>סה"כ זמן: {items.reduce((sum, item) => sum + item.duration, 0)} דקות</p>
      </div>

      {editorContent && (
        <div className="mt-8 text-right text-xs border-t pt-4 pb-2" dangerouslySetInnerHTML={{ __html: editorContent }} />
      )}
    </div>
  );
};

export default PrintPreview;