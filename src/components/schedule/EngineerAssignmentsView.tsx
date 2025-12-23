import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from 'lucide-react';

interface EngineerAssignmentsViewProps {
  selectedDate: Date;
}

const EngineerAssignmentsView: React.FC<EngineerAssignmentsViewProps> = ({ selectedDate }) => {
  return (
    <div className="space-y-6 print:space-y-2" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm mb-6">
        <h2 className="text-2xl font-bold mb-2 md:mb-0 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-600 mx-[17px]" />
          סידור עבודה טכנאים
        </h2>
      </div>
      
      <Card className="p-6 text-center">
        <div className="flex flex-col items-center space-y-4">
          <FileText className="h-16 w-16 text-gray-400" />
          <div>
            <h3 className="text-lg font-medium mb-2">טרם פורסם סידור עבודה לטכנאים</h3>
            <p className="text-gray-500">
              סידור העבודה לטכנאים לשבוע זה טרם הועלה למערכת
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EngineerAssignmentsView;
