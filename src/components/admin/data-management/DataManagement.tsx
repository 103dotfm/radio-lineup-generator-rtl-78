
import React from 'react';
import { Download, Upload, Database, RefreshCw } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
// Tabs removed; controlled by sidebar sub param
import { useSearchParams } from 'react-router-dom';
import ExportDataTab from './export/ExportDataTab';
import ImportDataTab from './ImportDataTab';
import BackupRestoreTab from './backup/BackupRestoreTab';

const DataManagement = () => {
  const [searchParams] = useSearchParams();
  const sub = (searchParams.get('sub') as 'export' | 'import' | 'backup') || 'export';

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">ניהול נתונים</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            ייצוא וייבוא של נתוני המערכת
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          {sub === 'export' && (
            <div className="space-y-3 sm:space-y-4 pt-2">
              <ExportDataTab />
            </div>
          )}
          {sub === 'import' && (
            <div className="space-y-3 sm:space-y-4 pt-2">
              <ImportDataTab />
            </div>
          )}
          {sub === 'backup' && (
            <div className="space-y-3 sm:space-y-4 pt-2">
              <BackupRestoreTab />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="text-xs sm:text-sm text-gray-500">
            {/* Placeholder for status messages */}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default DataManagement;
