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
    <div className="print-content">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">{showName}</h1>
        <h2 className="text-lg text-gray-600 mt-1">
          {showTime} {showDate ? format(showDate, 'dd/MM/yyyy') : ''}
        </h2>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="py-1 px-2 text-right border border-gray-200">שם</th>
            <th className="py-1 px-2 text-right border border-gray-200">כותרת</th>
            <th className="py-1 px-2 text-right border border-gray-200">פרטים</th>
            <th className="py-1 px-2 text-right border border-gray-200">טלפון</th>
            <th className="py-1 px-2 text-right border border-gray-200">דקות</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            item.isBreak ? (
              <tr key={item.id} className="bg-gray-100">
                <td colSpan={5} className="py-1 px-2 text-center border border-gray-200">
                  {item.name} - {item.duration} דקות
                </td>
              </tr>
            ) : (
              <tr key={item.id}>
                <td className="py-1 px-2 border border-gray-200">{item.name}</td>
                <td className="py-1 px-2 border border-gray-200">{item.title}</td>
                <td className="py-1 px-2 border border-gray-200">{item.details}</td>
                <td className="py-1 px-2 border border-gray-200">{item.phone}</td>
                <td className="py-1 px-2 border border-gray-200">{item.duration} דקות</td>
              </tr>
            )
          ))}
        </tbody>
      </table>

      <div className="mt-2 text-left text-sm">
        <p>סה"כ זמן: {items.reduce((sum, item) => sum + item.duration, 0)} דקות</p>
      </div>

      {editorContent && (
        <div className="credits mt-8" dangerouslySetInnerHTML={{ __html: editorContent }} />
      )}
    </div>
  );
};

export default PrintPreview;