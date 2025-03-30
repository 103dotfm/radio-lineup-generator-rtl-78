import React, { useRef, useState } from 'react';
import { Upload, FileUp, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { ConflictDialog } from './ConflictDialog';
import { GlobalResolutionDialog } from './GlobalResolutionDialog';

type ConflictResolution = 'overwrite' | 'keep' | 'ask';
type ConflictItem = {
  id: string;
  table: string;
  existingData: any;
  newData: any;
  resolution?: 'overwrite' | 'keep';
};

type ValidTableName = "shows_backup" | "show_items" | "interviewees" | "schedule_slots_old" | 
  "day_notes" | "email_settings" | "email_recipients" | "work_arrangements" | 
  "show_email_logs" | "system_settings" | "users";

const ImportDataTab = () => {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>('ask');
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [showGlobalResolutionDialog, setShowGlobalResolutionDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    setUploadProgress(0);
    
    const reader = new FileReader();
    
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(progress);
      }
    };
    
    reader.onload = async (event) => {
      try {
        const fileContent = event.target?.result as string;
        const importData = JSON.parse(fileContent);
        
        if (!importData || typeof importData !== 'object') {
          throw new Error('קובץ לא חוקי. יש להשתמש בקובץ שיוצא מהמערכת.');
        }
        
        await processImportData(importData);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error: any) {
        console.error('Import error:', error);
        toast({
          title: "שגיאה בייבוא נתונים",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsImporting(false);
        setUploadProgress(0);
      }
    };
    
    reader.onerror = () => {
      setIsImporting(false);
      setUploadProgress(0);
      toast({
        title: "שגיאה בקריאת הקובץ",
        description: "אירעה שגיאה בקריאת הקובץ. נסה שוב.",
        variant: "destructive",
      });
    };
    
    reader.readAsText(file);
  };

  const processImportData = async (importData: Record<string, any[]>) => {
    const conflictItems: ConflictItem[] = [];
    
    for (const [tableName, records] of Object.entries(importData)) {
      let actualTableName = tableName;
      if (tableName === 'shows') {
        actualTableName = 'shows_backup';
      } else if (tableName === 'schedule_slots') {
        actualTableName = 'schedule_slots_old';
      }

      if (!Array.isArray(records) || records.length === 0) continue;
      
      for (const record of records) {
        if (!record.id) continue;
        
        const { data: existingData, error } = await supabase
          .from(actualTableName as ValidTableName)
          .select('*')
          .eq('id', record.id)
          .single();
        
        if (!error && existingData) {
          conflictItems.push({
            id: record.id,
            table: actualTableName,
            existingData,
            newData: record
          });
        }
      }
    }
    
    if (conflictItems.length > 0) {
      setConflicts(conflictItems);
      
      if (conflictResolution === 'ask') {
        setShowGlobalResolutionDialog(true);
      } else {
        await saveImportData(importData, conflictResolution);
      }
    } else {
      await saveImportData(importData, 'overwrite');
    }
  };

  const saveImportData = async (importData: Record<string, any[]>, resolution: ConflictResolution) => {
    try {
      for (const [tableName, records] of Object.entries(importData)) {
        let actualTableName = tableName;
        if (tableName === 'shows') {
          actualTableName = 'shows_backup';
        } else if (tableName === 'schedule_slots') {
          actualTableName = 'schedule_slots_old';
        }
        
        if (!Array.isArray(records) || records.length === 0) continue;
        
        for (const record of records) {
          if (!record.id) continue;
          
          const { data: existingData, error: checkError } = await supabase
            .from(actualTableName as ValidTableName)
            .select('id')
            .eq('id', record.id)
            .single();
          
          if (!checkError && existingData) {
            if (resolution === 'overwrite') {
              const { error: updateError } = await supabase
                .from(actualTableName as ValidTableName)
                .update(record)
                .eq('id', record.id);
              
              if (updateError) {
                console.error(`Error updating ${actualTableName} record:`, updateError);
              }
            }
          } else {
            const { error: insertError } = await supabase
              .from(actualTableName as ValidTableName)
              .insert(record);
            
            if (insertError) {
              console.error(`Error inserting ${actualTableName} record:`, insertError);
            }
          }
        }
      }
      
      toast({
        title: "ייבוא הצליח",
        description: "הנתונים יובאו בהצלחה למערכת",
        variant: "default",
      });
    } catch (error: any) {
      console.error('Data import error:', error);
      toast({
        title: "שגיאה בייבוא נתונים",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleConflictResolution = async (globalResolution: ConflictResolution) => {
    setShowGlobalResolutionDialog(false);
    
    if (globalResolution === 'ask') {
      setCurrentConflictIndex(0);
      setShowConflictDialog(true);
    } else {
      const importData: Record<string, any[]> = {};
      
      conflicts.forEach(conflict => {
        if (!importData[conflict.table]) {
          importData[conflict.table] = [];
        }
        importData[conflict.table].push(conflict.newData);
      });
      
      await saveImportData(importData, globalResolution);
    }
  };

  const resolveCurrentConflict = (resolution: 'overwrite' | 'keep') => {
    const updatedConflicts = [...conflicts];
    updatedConflicts[currentConflictIndex].resolution = resolution;
    setConflicts(updatedConflicts);
    
    if (currentConflictIndex < conflicts.length - 1) {
      setCurrentConflictIndex(prevIndex => prevIndex + 1);
    } else {
      setShowConflictDialog(false);
      
      await processIndividualConflicts();
    }
  };

  const processIndividualConflicts = async () => {
    try {
      const tableData: Record<string, any[]> = {};
      
      conflicts.forEach(conflict => {
        if (!tableData[conflict.table]) {
          tableData[conflict.table] = [];
        }
        
        if (conflict.resolution === 'overwrite') {
          tableData[conflict.table].push(conflict.newData);
        }
      });
      
      for (const [tableName, records] of Object.entries(tableData)) {
        for (const record of records) {
          const { error } = await supabase
            .from(tableName as ValidTableName)
            .update(record)
            .eq('id', record.id);
          
          if (error) {
            console.error(`Error updating ${tableName} record:`, error);
          }
        }
      }
      
      toast({
        title: "ייבוא הצליח",
        description: "הנתונים יובאו בהצלחה למערכת",
        variant: "default",
      });
    } catch (error: any) {
      console.error('Error processing individual conflicts:', error);
      toast({
        title: "שגיאה בייבוא נתונים",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
        <FileUp className="h-8 w-8 mx-auto text-gray-400" />
        <div>
          <p className="text-gray-500">גרור קובץ לכאן או</p>
          <Button
            variant="outline"
            className="mt-2"
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 ms-2" />
            בחר קובץ
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".json"
            onChange={handleFileUpload}
            disabled={isImporting}
          />
        </div>
        
        {isImporting && (
          <div className="space-y-2">
            <Progress value={uploadProgress} />
            <p className="text-sm text-gray-500">
              מעלה קובץ... {uploadProgress}%
            </p>
          </div>
        )}
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-start space-x-2 space-x-reverse">
          <Info className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="font-medium">אפשרויות טיפול בנתונים כפולים</h4>
            <div className="mt-2 space-y-2">
              <div className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="radio"
                  id="resolution-ask"
                  name="conflict-resolution"
                  value="ask"
                  checked={conflictResolution === 'ask'}
                  onChange={() => setConflictResolution('ask')}
                />
                <Label htmlFor="resolution-ask">
                  שאל לגבי כל התנגשות
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="radio"
                  id="resolution-overwrite"
                  name="conflict-resolution"
                  value="overwrite"
                  checked={conflictResolution === 'overwrite'}
                  onChange={() => setConflictResolution('overwrite')}
                />
                <Label htmlFor="resolution-overwrite">
                  דרוס את כל הנתונים הקיימים
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="radio"
                  id="resolution-keep"
                  name="conflict-resolution"
                  value="keep"
                  checked={conflictResolution === 'keep'}
                  onChange={() => setConflictResolution('keep')}
                />
                <Label htmlFor="resolution-keep">
                  שמור על הנתונים הקיימים
                </Label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConflictDialog 
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        conflict={conflicts[currentConflictIndex]}
        currentIndex={currentConflictIndex}
        totalConflicts={conflicts.length}
        onResolve={resolveCurrentConflict}
      />

      <GlobalResolutionDialog
        open={showGlobalResolutionDialog}
        onOpenChange={setShowGlobalResolutionDialog}
        conflictCount={conflicts.length}
        onResolve={handleConflictResolution}
      />
    </div>
  );
};

export default ImportDataTab;
