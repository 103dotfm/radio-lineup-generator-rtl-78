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
    isBreak?: boolean;
    isNote?: boolean;
  }>;
  editorContent: string;
}

const PrintPreview = ({ showName, showTime, showDate, items, editorContent }: PrintPreviewProps) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="print-content bg-white">
      <div className="flex justify-center mb-6">
        <img src="/lovable-uploads/a330123d-e032-4391-99b3-87c3c7ce6253.png" alt="103FM" className="h-16" />
      </div>
      
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
            {isAuthenticated && (
              <th className="py-1 px-2 text-right border border-gray-200">טלפון</th>
            )}
            <th className="py-1 px-2 text-right border border-gray-200">דקות</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            if (item.isBreak) {
              return (
                <tr key={item.id} className="bg-gray-100">
                  <td colSpan={isAuthenticated ? 5 : 4} className="py-2 px-4 text-center border border-gray-200 font-medium">
                    {item.name} - {item.duration} דקות
                  </td>
                </tr>
              );
            }
            
            if (item.isNote) {
              return (
                <tr key={item.id} className="bg-gray-800">
                  <td colSpan={isAuthenticated ? 5 : 4} className="py-2 px-4 text-center border border-gray-200 italic text-white">
                    <div dangerouslySetInnerHTML={{ __html: item.details || '' }} />
                  </td>
                </tr>
              );
            }

            return (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="py-2 px-4 border border-gray-200 font-medium">{item.name}</td>
                <td className="py-2 px-4 border border-gray-200">{item.title}</td>
                <td className="py-2 px-4 border border-gray-200 whitespace-pre-line text-gray-600">{item.details}</td>
                {isAuthenticated && (
                  <td className="py-2 px-4 border border-gray-200 text-gray-500">{item.phone}</td>
                )}
                <td className="py-2 px-4 border border-gray-200 text-right">{item.duration} דקות</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 text-left text-sm text-gray-600">
        <p>סה"כ זמן: {items.reduce((sum, item) => sum + (item.duration || 0), 0)} דקות</p>
      </div>

      {editorContent && (
        <div 
          className="credits mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500"
          dangerouslySetInnerHTML={{ __html: editorContent }}
        />
      )}
    </div>
  );
};

export default PrintPreview;