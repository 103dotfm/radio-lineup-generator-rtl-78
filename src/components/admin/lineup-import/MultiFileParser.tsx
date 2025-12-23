import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ParseResult } from './types';
import { apiClient } from '@/lib/api-client';

const MultiFileParser: React.FC = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parseResults, setParseResults] = useState<ParseResult[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);

  const handleFilesSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Validate file count
    if (files.length > 1000) {
      toast({
        title: 'שגיאה',
        description: 'מקסימום 1000 קבצים בכל פעם',
        variant: 'destructive',
      });
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.toLowerCase().split('.').pop();
      
      if (ext !== 'doc' && ext !== 'docx') {
        toast({
          title: 'שגיאה',
          description: `הקובץ ${file.name} אינו קובץ Word תקין`,
          variant: 'destructive',
        });
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'שגיאה',
          description: `הקובץ ${file.name} חורג מהגודל המותר (10MB)`,
          variant: 'destructive',
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      return;
    }

    setSelectedFiles(Array.from(validFiles));
    await parseFiles(validFiles);
  };

  const parseFiles = async (files: File[]) => {
    setIsParsing(true);
    setParseResults([]);
    setProgress(0);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      // Don't set Content-Type - let axios/browser set it automatically with boundary for FormData
      // The Authorization header will be added by the apiClient interceptor
      const response = await apiClient.post('/lineup-import/parse-multiple', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          }
        },
      });

      if (response.data.success) {
        setParseResults(response.data.results);
        toast({
          title: 'הצלחה',
          description: `נפרסו ${response.data.successful} מתוך ${response.data.total} קבצים`,
        });
      } else {
        throw new Error(response.data.message || 'שגיאה בניתוח הקבצים');
      }
    } catch (error: any) {
      console.error('Error parsing files:', error);
      toast({
        title: 'שגיאה',
        description: error.response?.data?.message || error.message || 'שגיאה בניתוח הקבצים',
        variant: 'destructive',
      });
    } finally {
      setIsParsing(false);
      setProgress(0);
    }
  };

  const handleSaveAll = async () => {
    // Filter only successful parses with valid data
    const validLineups = parseResults
      .filter((r) => r.success && r.data && r.data.showName && r.data.showDate && r.data.items.length > 0)
      .map((r) => ({
        filename: r.filename,
        showName: r.data!.showName,
        showDate: r.data!.showDate,
        showTime: r.data!.showTime,
        items: r.data!.items,
      }));

    if (validLineups.length === 0) {
      toast({
        title: 'שגיאה',
        description: 'אין ליינאפים תקינים לשמירה',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await apiClient.post('/lineup-import/save-multiple', {
        lineups: validLineups,
      });

      if (response.data.success) {
        toast({
          title: 'הצלחה',
          description: `נשמרו ${response.data.successful} מתוך ${response.data.total} ליינאפים`,
        });
        // Reset after successful save
        setParseResults([]);
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(response.data.message || 'שגיאה בשמירת הליינאפים');
      }
    } catch (error: any) {
      console.error('Error saving lineups:', error);
      toast({
        title: 'שגיאה',
        description: error.response?.data?.message || error.message || 'שגיאה בשמירת הליינאפים',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFilesSelect(files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFilesSelect(files);
    }
  };

  const successfulCount = parseResults.filter((r) => r.success).length;
  const failedCount = parseResults.filter((r) => !r.success).length;
  const validForSave = parseResults.filter(
    (r) => r.success && r.data && r.data.showName && r.data.showDate && r.data.items.length > 0
  ).length;

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>ייבוא מרובה קבצים</CardTitle>
          <CardDescription>
            העלה עד 1000 קבצי Word (.doc או .docx) לייבוא אוטומטי למסד הנתונים
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center space-y-4 cursor-pointer hover:border-blue-400 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="h-12 w-12 mx-auto text-gray-400" />
            <div>
              <p className="text-gray-600 mb-2">
                גרור קבצים לכאן או לחץ לבחירת קבצים
              </p>
              <p className="text-sm text-gray-500">
                עד 1000 קבצי Word (.doc, .docx), עד 10MB כל קובץ
              </p>
            </div>
            <Button
              variant="outline"
              disabled={isParsing}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Upload className="h-4 w-4 ml-2" />
              בחר קבצים
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".doc,.docx"
              multiple
              onChange={handleInputChange}
              disabled={isParsing}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-2">
                נבחרו {selectedFiles.length} קבצים
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedFiles.slice(0, 5).map((file, index) => (
                  <span
                    key={index}
                    className="text-xs bg-white px-2 py-1 rounded border"
                  >
                    {file.name}
                  </span>
                ))}
                {selectedFiles.length > 5 && (
                  <span className="text-xs text-gray-500">
                    +{selectedFiles.length - 5} נוספים
                  </span>
                )}
              </div>
            </div>
          )}

          {isParsing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">מנתח קבצים...</span>
                <span className="text-gray-600">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {parseResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>תוצאות ניתוח</CardTitle>
                <CardDescription className="mt-2">
                  {successfulCount} הצליחו, {failedCount} נכשלו
                  {validForSave > 0 && `, ${validForSave} מוכנים לשמירה`}
                </CardDescription>
              </div>
              {validForSave > 0 && (
                <Button onClick={handleSaveAll} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <span className="ml-2">שומר...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 ml-2" />
                      שמור הכל ({validForSave})
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table dir="rtl">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם קובץ</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">שם תוכנית</TableHead>
                    <TableHead className="text-right">תאריך</TableHead>
                    <TableHead className="text-right">מספר פריטים</TableHead>
                    <TableHead className="text-right">שגיאה</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parseResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {result.filename}
                      </TableCell>
                      <TableCell>
                        {result.success ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>הצליח</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span>נכשל</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.data?.showName || '-'}
                      </TableCell>
                      <TableCell>
                        {result.data?.showDate || '-'}
                      </TableCell>
                      <TableCell>
                        {result.data?.items.length || 0}
                      </TableCell>
                      <TableCell className="text-red-600 text-sm">
                        {result.error || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {parseResults.length === 0 && !isParsing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">ייבוא מרובה</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>העלה עד 1000 קבצי Word בבת אחת</li>
                  <li>המערכת תנתח את כל הקבצים אוטומטית</li>
                  <li>תוכל לראות את התוצאות לפני השמירה</li>
                  <li>לאחר אישור, כל הליינאפים יישמרו למסד הנתונים</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MultiFileParser;

