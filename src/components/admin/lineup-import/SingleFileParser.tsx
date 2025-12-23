import React, { useState, useRef } from 'react';
import { Upload, FileText, RefreshCw, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import ParsedLineupPreview from './ParsedLineupPreview';
import { ParsedLineupData } from './types';
import { apiClient } from '@/lib/api-client';

const SingleFileParser: React.FC = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedLineupData | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'doc' && ext !== 'docx') {
      toast({
        title: 'שגיאה',
        description: 'רק קבצי Word (.doc, .docx) נתמכים',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'שגיאה',
        description: 'גודל הקובץ חורג מהמותר (10MB)',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    await parseFile(file);
  };

  const parseFile = async (file: File) => {
    setIsParsing(true);
    setParsedData(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Don't set Content-Type - let axios/browser set it automatically with boundary for FormData
      // The Authorization header will be added by the apiClient interceptor
      const response = await apiClient.post('/lineup-import/parse', formData);

      if (response.data.success) {
        setParsedData(response.data.data);
        toast({
          title: 'הצלחה',
          description: 'הקובץ נפרס בהצלחה',
        });
      } else {
        throw new Error(response.data.message || 'שגיאה בניתוח הקובץ');
      }
    } catch (error: any) {
      console.error('Error parsing file:', error);
      toast({
        title: 'שגיאה',
        description: error.response?.data?.message || error.message || 'שגיאה בניתוח הקובץ',
        variant: 'destructive',
      });
      setParsedData(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!parsedData) return;

    // Validate required fields
    if (!parsedData.showName || !parsedData.showDate) {
      toast({
        title: 'שגיאה',
        description: 'יש למלא שם התוכנית ותאריך',
        variant: 'destructive',
      });
      return;
    }

    if (parsedData.items.length === 0) {
      toast({
        title: 'שגיאה',
        description: 'יש להוסיף לפחות פריט אחד לליינאפ',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await apiClient.post('/lineup-import/save', parsedData);

      if (response.data.success) {
        toast({
          title: 'הצלחה',
          description: `הליינאפ נשמר בהצלחה. ${response.data.itemsCreated} פריטים נוצרו.`,
        });
        // Reset after successful save
        setParsedData(null);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(response.data.message || 'שגיאה בשמירת הליינאפ');
      }
    } catch (error: any) {
      console.error('Error saving lineup:', error);
      toast({
        title: 'שגיאה',
        description: error.response?.data?.message || error.message || 'שגיאה בשמירת הליינאפ',
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
      handleFileSelect(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>ייבוא קובץ בודד</CardTitle>
          <CardDescription>
            העלה קובץ Word (.doc או .docx) לניתוח וצפייה בתוצאות לפני שמירה
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
                גרור קובץ לכאן או לחץ לבחירת קובץ
              </p>
              <p className="text-sm text-gray-500">
                קבצי Word בלבד (.doc, .docx) עד 10MB
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
              בחר קובץ
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".doc,.docx"
              onChange={handleInputChange}
              disabled={isParsing}
            />
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium">{selectedFile.name}</span>
                <span className="text-xs text-gray-500">
                  ({(selectedFile.size / 1024).toFixed(2)} KB)
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => parseFile(selectedFile)}
                disabled={isParsing}
              >
                <RefreshCw className={`h-4 w-4 ml-2 ${isParsing ? 'animate-spin' : ''}`} />
                פרס מחדש
              </Button>
            </div>
          )}

          {isParsing && (
            <div className="flex items-center justify-center p-4">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600 ml-2" />
              <span className="text-gray-600">מנתח קובץ...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {parsedData && (
        <div className="space-y-4">
          <ParsedLineupPreview data={parsedData} onDataChange={setParsedData} />

          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 justify-start">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !parsedData.showName || !parsedData.showDate}
                  className="min-w-[150px]"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 ml-2" />
                      שמור למסד הנתונים
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setParsedData(null);
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  נקה
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!parsedData && !isParsing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">איך זה עובד?</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>העלה קובץ Word המכיל ליינאפ</li>
                  <li>המערכת תזהה אוטומטית את שם התוכנית, התאריך והטבלה</li>
                  <li>תוכל לערוך את הנתונים לפני השמירה</li>
                  <li>לאחר אישור, הליינאפ יישמר למסד הנתונים</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SingleFileParser;

