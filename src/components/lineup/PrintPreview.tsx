import React from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

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
    is_break?: boolean;
    is_note?: boolean;
  }>;
  editorContent: string;
}

const PrintPreview = ({ showName, showTime, showDate, items, editorContent }: PrintPreviewProps) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="print-content bg-white p-4">
      <div className="flex flex-col items-center mb-4">
        <img src="/lovable-uploads/a330123d-e032-4391-99b3-87c3c7ce6253.png" alt="103FM" className="h-16" />
        <div className="text-center mt-2">
          <h1 className="text-2xl font-bold">{showName}</h1>
          <h2 className="text-lg text-gray-600">
            {showTime} {showDate ? format(showDate, 'dd/MM/yyyy') : ''}
          </h2>
        </div>
      </div>

      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr>
            <th className="py-2 px-4 text-right border border-gray-200 text-base">שם</th>
            <th className="py-2 px-4 text-right border border-gray-200 text-base">קרדיט</th>
            <th className="py-2 px-4 text-right border border-gray-200 text-base">פרטים</th>
            {isAuthenticated && (
              <th className="py-2 px-4 text-right border border-gray-200 text-base">טלפון</th>
            )}
            <th className="py-2 px-4 text-right border border-gray-200 text-base">דק'</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            if (item.is_break) {
              return (
                <tr key={item.id} className="bg-black/10">
                  <td colSpan={isAuthenticated ? 5 : 4} className="py-3 px-4 text-center border border-gray-200 font-medium text-base">
                    {item.name} - {item.duration} דקות
                  </td>
                </tr>
              );
            }
            
            if (item.is_note) {
              return (
                <tr key={item.id} className="bg-black/10">
                  <td colSpan={isAuthenticated ? 5 : 4} className="py-3 px-4 text-center border border-gray-200 italic text-black text-base">
                    <div dangerouslySetInnerHTML={{ __html: item.details || '' }} />
                  </td>
                </tr>
              );
            }

            return (
              <tr key={item.id}>
                <td className="py-3 px-4 border border-gray-200 font-medium text-base">{item.name}</td>
                <td className="py-3 px-4 border border-gray-200 text-base">{item.title}</td>
                <td className="py-3 px-4 border border-gray-200 text-base prose prose-sm max-w-none [&_*]:!text-base" dangerouslySetInnerHTML={{ __html: item.details }} />
                {isAuthenticated && (
                  <td className="py-3 px-4 border border-gray-200 text-base">{item.phone}</td>
                )}
                <td className="py-3 px-4 border border-gray-200 text-right text-base">{item.duration}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 text-left text-base text-gray-600">
        <p>סה"כ זמן: {items.reduce((sum, item) => sum + (item.duration || 0), 0)} דקות</p>
      </div>

      {editorContent && (
        <div 
          className="credits mt-8 pt-4 border-t border-gray-200 text-base text-black text-center"
          dangerouslySetInnerHTML={{ __html: editorContent }}
        />
      )}
    </div>
  );
};

export default PrintPreview;