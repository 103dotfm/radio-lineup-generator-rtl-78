
import React from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { ShowItem, Interviewee } from '@/types/show';

interface PrintPreviewProps {
  showName: string;
  showTime: string;
  showDate?: Date;
  items: Array<ShowItem & {
    interviewees?: Interviewee[];
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
          <h1 className="text-2xl font-bold showName">{showName}</h1>
          <h2 className="text-lg text-gray-600">
            {showTime} {showDate ? format(showDate, 'dd/MM/yyyy') : ''}
          </h2>
        </div>
      </div>

      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr>
            <th className="py-2 px-4 text-right border border-gray-200 text-base align-top">שם</th>
            <th className="py-2 px-4 text-right border border-gray-200 text-base align-top">קרדיט</th>
            <th className="py-2 px-4 text-right border border-gray-200 text-base align-top">פרטים</th>
            {isAuthenticated && (
              <th className="py-2 px-4 text-right border border-gray-200 text-base align-top">טלפון</th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            if (item.is_break) {
              return (
                <tr key={item.id} className="breakRow bg-black/10">
                  <td colSpan={isAuthenticated ? 5 : 4} className="py-3 px-4 text-center border border-gray-200 font-medium text-base">
                    {item.name}
                  </td>
                </tr>
              );
            }
            
            if (item.is_note) {
              return (
                <tr key={item.id} className="noteRow">
                  <td colSpan={isAuthenticated ? 5 : 4} className="py-3 px-4 text-center border border-gray-200 text-black text-base">
                    <div dangerouslySetInnerHTML={{ __html: item.details || '' }} />
                  </td>
                </tr>
              );
            }

            return (
              <>
                <tr key={item.id}>
                  <td className="py-3 px-4 border border-gray-200 font-medium text-base">
                    <div className="min-h-[24px] flex items-center">{item.name}</div>
                  </td>
                  <td className="py-3 px-4 border border-gray-200 text-base">
                    <div className="min-h-[24px] flex items-center">{item.title}</div>
                  </td>
                  <td className="py-3 px-4 border border-gray-200 text-base prose prose-sm max-w-none break-words whitespace-normal" rowSpan={(item.interviewees?.length || 0) + 1}>
                    <div dangerouslySetInnerHTML={{ __html: item.details }} />
                  </td>
                  {isAuthenticated && (
                    <td className="py-3 px-4 border border-gray-200 text-base">
                      <div className="min-h-[24px] flex items-center">{item.phone}</div>
                    </td>
                  )}
                </tr>
                {item.interviewees?.map((interviewee) => (
                  <tr key={interviewee.id}>
                    <td className="py-3 px-4 border border-gray-200 text-base">
                      <div className="min-h-[24px] flex items-center">{interviewee.name}</div>
                    </td>
                    <td className="py-3 px-4 border border-gray-200 text-base">
                      <div className="min-h-[24px] flex items-center">{interviewee.title}</div>
                    </td>
                    {isAuthenticated && (
                      <td className="py-3 px-4 border border-gray-200 text-base">
                        <div className="min-h-[24px] flex items-center">{interviewee.phone}</div>
                      </td>
                    )}
                  </tr>
                ))}
              </>
            );
          })}
        </tbody>
      </table>

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
