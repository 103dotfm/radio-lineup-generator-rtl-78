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
  }>;
  editorContent: string;
}

const PrintPreview = ({ showName, showTime, showDate, items, editorContent }: PrintPreviewProps) => {
  return (
    <div className="print-content">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">{showName}</h1>
        <h2 className="text-xl text-gray-600 mt-2">
          {showTime} {showDate ? format(showDate, 'dd/MM/yyyy') : ''}
        </h2>
      </div>

      {editorContent && (
        <div className="mt-8 text-right" dangerouslySetInnerHTML={{ __html: editorContent }} />
      )}

      <table className="w-full border-collapse mt-8">
        <thead>
          <tr>
            <th className="py-2 px-4 text-right border border-gray-200">שם</th>
            <th className="py-2 px-4 text-right border border-gray-200">כותרת</th>
            <th className="py-2 px-4 text-right border border-gray-200">פרטים</th>
            <th className="py-2 px-4 text-right border border-gray-200">טלפון</th>
            <th className="py-2 px-4 text-right border border-gray-200">דקות</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border border-gray-200">
              <td className="py-2 px-4 border border-gray-200">{item.name}</td>
              <td className="py-2 px-4 border border-gray-200">{item.title}</td>
              <td className="py-2 px-4 border border-gray-200">{item.details}</td>
              <td className="py-2 px-4 border border-gray-200">{item.phone}</td>
              <td className="py-2 px-4 border border-gray-200">{item.duration} דקות</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 text-left">
        <p>סה"כ זמן: {items.reduce((sum, item) => sum + item.duration, 0)} דקות</p>
      </div>
    </div>
  );
};

export default PrintPreview;