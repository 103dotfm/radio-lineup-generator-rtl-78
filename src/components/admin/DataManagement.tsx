import React, { useState, useRef } from 'react';
import { format, parse, isValid } from 'date-fns';
import { 
  Download, 
  Upload, 
  Calendar, 
  AlertTriangle, 
  Check, 
  X,
  FileUp,
  Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ConflictResolution = 'overwrite' | 'keep' | 'ask';
type ConflictItem = {
  id: string;
  table: string;
  existingData: any;
  newData: any;
  resolution?: 'overwrite' | 'keep';
};

// Define valid table names to satisfy TypeScript
type ValidTableName = "shows" | "show_items" | "interviewees" | "schedule_slots" | 
  "day_notes" | "email_settings" | "email_recipients" | "work_arrangements" | 
  "show_email_logs" | "system_settings" | "users";

const DataManagement = () => {
  const { toast } = useToast();
  const [exportStartDate, setExportStartDate] = useState<Date | undefined>(undefined);
  const [exportEndDate, setExportEndDate] = useState<Date | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>('ask');
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [showGlobalResolutionDialog, setShowGlobalResolutionDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("export");
  
  // Tables to export/import
  const [selectedTables, setSelectedTables] = useState({
    shows: true,
    show_items: true,
    interviewees: true,
    schedule_slots: true,
    day_notes: true,
    email_settings: false,
    email_recipients: false,
    work_arrangements: false,
  });

  // Helper to format dates for display
  const formatDate = (date?: Date) => {
    if (!date) return 'לא נבחר';
    return format(date, 'dd/MM/yyyy');
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const exportData: Record<string, any[]> = {};
      const tables = Object.entries(selectedTables)
        .filter(([_, isSelected]) => isSelected)
        .map(([tableName]) => tableName);
      
      let filteredShowIds: string[] = [];
      let filteredShowItemIds: string[] = [];
      
      // If date range is specified, first get the IDs of shows within that range
      if (exportStartDate || exportEndDate) {
        let showsQuery = supabase.from('shows' as ValidTableName).select('id');
        
        if (exportStartDate) {
          const formattedStartDate = format(exportStartDate, 'yyyy-MM-dd');
          showsQuery = showsQuery.gte('date', formattedStartDate);
        }
        
        if (exportEndDate) {
          const formattedEndDate = format(exportEndDate, 'yyyy-MM-dd');
          showsQuery = showsQuery.lte('date', formattedEndDate);
        }
        
        const { data: filteredShows, error: showsError } = await showsQuery;
        
        if (showsError) {
          throw new Error(`Error filtering shows: ${showsError.message}`);
        }
        
        filteredShowIds = filteredShows?.map(show => show.id) || [];
        
        // Get show items for these shows to later filter interviewees
        if (filteredShowIds.length > 0) {
          // Using as any to avoid excessive type instantiation
          const { data: filteredItems, error: itemsError } = await supabase
            .from('show_items' as ValidTableName)
            .select('id')
            .in('show_id', filteredShowIds) as any;
            
          if (itemsError) {
            throw new Error(`Error filtering show items: ${itemsError.message}`);
          }
          
          filteredShowItemIds = filteredItems?.map(item => item.id) || [];
        }
      }
      
      // Process each selected table
      for (const tableName of tables) {
        let query = supabase.from(tableName as ValidTableName).select('*');
        
        // Apply filters based on date range for each table type
        if (exportStartDate || exportEndDate) {
          if (tableName === 'shows') {
            // Shows are filtered directly by date
            if (exportStartDate) {
              const formattedStartDate = format(exportStartDate, 'yyyy-MM-dd');
              query = query.gte('date', formattedStartDate);
            }
            
            if (exportEndDate) {
              const formattedEndDate = format(exportEndDate, 'yyyy-MM-dd');
              query = query.lte('date', formattedEndDate);
            }
          } 
          else if (tableName === 'work_arrangements') {
            // Work arrangements are filtered by week_start
            if (exportStartDate) {
              const formattedStartDate = format(exportStartDate, 'yyyy-MM-dd');
              query = query.gte('week_start', formattedStartDate);
            }
            
            if (exportEndDate) {
              const formattedEndDate = format(exportEndDate, 'yyyy-MM-dd');
              query = query.lte('week_start', formattedEndDate);
            }
          }
          else if (tableName === 'show_items' && filteredShowIds.length > 0) {
            // Show items are filtered by show_id
            // Using as any to avoid excessive type instantiation
            query = query.in('show_id', filteredShowIds) as any;
          }
          else if (tableName === 'interviewees' && filteredShowItemIds.length > 0) {
            // Interviewees are filtered by item_id
            // Using as any to avoid excessive type instantiation
            query = query.in('item_id', filteredShowItemIds) as any;
          }
          // Other tables not filtered by date range
        }
        
        const { data, error } = await query;
        
        if (error) {
          throw new Error(`Error exporting ${tableName}: ${error.message}`);
        }
        
        exportData[tableName] = data || [];
      }
      
      // Create and download file
      const exportBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(exportBlob);
      const link = document.createElement('a');
      link.href = url;
      
      // Create filename with current date
      const today = format(new Date(), 'yyyy-MM-dd');
      let fileName = `radio-data-export-${today}.json`;
      
      // Add date range to filename if specified
      if (exportStartDate && exportEndDate) {
        const startStr = format(exportStartDate, 'yyyy-MM-dd');
        const endStr = format(exportEndDate, 'yyyy-MM-dd');
        fileName = `radio-data-export-${startStr}-to-${endStr}.json`;
      }
      
      link.download = fileName;
      link.click();
      
      toast({
        title: "ייצוא הצליח",
        description: `הנתונים יוצאו בהצלחה לקובץ ${fileName}`,
        variant: "default",
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "שגיאה בייצוא נתונים",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

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
        
        // Validate data structure
        if (!importData || typeof importData !== 'object') {
          throw new Error('קובץ לא חוקי. יש להשתמש בקובץ שיוצא מהמערכת.');
        }
        
        await processImportData(importData);
        
        // Reset file input
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
    // Check for potential conflicts first
    const conflictItems: ConflictItem[] = [];
    
    for (const [tableName, records] of Object.entries(importData)) {
      if (!Array.isArray(records) || records.length === 0) continue;
      
      for (const record of records) {
        if (!record.id) continue;
        
        // Check if record already exists
        const { data: existingData, error } = await supabase
          .from(tableName as ValidTableName)
          .select('*')
          .eq('id', record.id)
          .single();
        
        if (!error && existingData) {
          conflictItems.push({
            id: record.id,
            table: tableName,
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
      // No conflicts, proceed with import
      await saveImportData(importData, 'overwrite');
    }
  };

  const saveImportData = async (importData: Record<string, any[]>, resolution: ConflictResolution) => {
    try {
      // Import each table's data
      for (const [tableName, records] of Object.entries(importData)) {
        if (!Array.isArray(records) || records.length === 0) continue;
        
        // Process based on resolution strategy
        for (const record of records) {
          if (!record.id) continue;
          
          // Check if record exists
          const { data: existingData, error: checkError } = await supabase
            .from(tableName as ValidTableName)
            .select('id')
            .eq('id', record.id)
            .single();
          
          if (!checkError && existingData) {
            // Record exists, handle based on resolution
            if (resolution === 'overwrite') {
              const { error: updateError } = await supabase
                .from(tableName as ValidTableName)
                .update(record)
                .eq('id', record.id);
              
              if (updateError) {
                console.error(`Error updating ${tableName} record:`, updateError);
              }
            }
            // If 'keep', do nothing
          } else {
            // Record doesn't exist, insert it
            const { error: insertError } = await supabase
              .from(tableName as ValidTableName)
              .insert(record);
            
            if (insertError) {
              console.error(`Error inserting ${tableName} record:`, insertError);
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
      // Handle individual conflicts
      setCurrentConflictIndex(0);
      setShowConflictDialog(true);
    } else {
      // Apply global resolution
      const importData: Record<string, any[]> = {};
      
      // Reconstruct import data structure
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
    // Update resolution for current conflict
    const updatedConflicts = [...conflicts];
    updatedConflicts[currentConflictIndex].resolution = resolution;
    setConflicts(updatedConflicts);
    
    // Move to next conflict or finish
    if (currentConflictIndex < conflicts.length - 1) {
      setCurrentConflictIndex(prevIndex => prevIndex + 1);
    } else {
      setShowConflictDialog(false);
      
      // Process all conflicts with their individual resolutions
      processIndividualConflicts();
    }
  };

  const processIndividualConflicts = async () => {
    try {
      // Group conflicts by table
      const tableData: Record<string, any[]> = {};
      
      conflicts.forEach(conflict => {
        if (!tableData[conflict.table]) {
          tableData[conflict.table] = [];
        }
        
        // Only include data to be saved based on resolution
        if (conflict.resolution === 'overwrite') {
          tableData[conflict.table].push(conflict.newData);
        }
      });
      
      // Save data by table
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

  const renderConflictDetails = () => {
    if (conflicts.length === 0 || currentConflictIndex >= conflicts.length) {
      return null;
    }
    
    const conflict = conflicts[currentConflictIndex];
    
    return (
      <div className="space-y-4 max-h-96 overflow-auto">
        <div className="flex justify-between">
          <span className="font-semibold">טבלה:</span>
          <span>{conflict.table}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">מזהה רשומה:</span>
          <span>{conflict.id}</span>
        </div>
        
        <div className="border p-3 rounded-md bg-gray-50">
          <h4 className="font-medium mb-2">נתונים קיימים במערכת:</h4>
          <pre className="text-xs overflow-x-auto">{JSON.stringify(conflict.existingData, null, 2)}</pre>
        </div>
        
        <div className="border p-3 rounded-md bg-blue-50">
          <h4 className="font-medium mb-2">נתונים חדשים מהקובץ:</h4>
          <pre className="text-xs overflow-x-auto">{JSON.stringify(conflict.newData, null, 2)}</pre>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">ניהול נתונים</CardTitle>
          <CardDescription>
            ייצוא וייבוא של נתוני המערכת
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="export" className="space-y-4" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="export">
                <Download className="h-4 w-4 ms-2" />
                ייצוא נתונים
              </TabsTrigger>
              <TabsTrigger value="import">
                <Upload className="h-4 w-4 ms-2" />
                ייבוא נתונים
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="export" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="font-medium">טווח תאריכים (אופציונלי)</div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>מתאריך</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            disabled={isExporting}
                          >
                            <Calendar className="ms-2 h-4 w-4" />
                            {formatDate(exportStartDate)}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={exportStartDate}
                            onSelect={setExportStartDate}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>עד תאריך</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            disabled={isExporting}
                          >
                            <Calendar className="ms-2 h-4 w-4" />
                            {formatDate(exportEndDate)}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={exportEndDate}
                            onSelect={setExportEndDate}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="font-medium mb-3">טבלאות לייצוא</div>
                  
                  <div className="space-y-2">
                    {Object.entries(selectedTables).map(([tableName, isSelected]) => (
                      <div key={tableName} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox 
                          id={`export-${tableName}`} 
                          checked={isSelected}
                          onCheckedChange={(checked) => 
                            setSelectedTables({...selectedTables, [tableName]: !!checked})
                          }
                          disabled={isExporting}
                        />
                        <Label 
                          htmlFor={`export-${tableName}`}
                          className="cursor-pointer"
                        >
                          {tableName}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="import" className="space-y-4">
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
                    <h4 className="font-medium">אפשרויות טיפול בתנאים כפולים</h4>
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
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            {/* Placeholder for status messages */}
          </div>
          
          {activeTab === 'export' && (
            <Button 
              onClick={handleExport} 
              disabled={isExporting || !Object.values(selectedTables).some(v => v)}
            >
              {isExporting ? (
                <>מייצא נתונים...</>
              ) : (
                <>
                  <Download className="ms-2 h-4 w-4" />
                  ייצא נתונים
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Global conflict resolution dialog */}
      <AlertDialog open={showGlobalResolutionDialog} onOpenChange={setShowGlobalResolutionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>נמצאו {conflicts.length} התנגשויות נתונים</AlertDialogTitle>
            <AlertDialogDescription>
              נמצאו רשומות בקובץ שכבר קיימות במערכת. כיצד ברצונך לטפל בהתנגשויות אלו?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowGlobalResolutionDialog(false)}>
              בטל ייבוא
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConflictResolution('keep')}>
              שמור על הנתונים הקיימים
            </AlertDialogAction>
            <AlertDialogAction onClick={() => handleConflictResolution('overwrite')}>
              דרוס בנתונים החדשים
            </AlertDialogAction>
            <AlertDialogAction onClick={() => handleConflictResolution('ask')}>
              בדוק כל התנגשות
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Individual conflict resolution dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              התנגשות נתונים {currentConflictIndex + 1} מתוך {conflicts.length}
            </DialogTitle>
            <DialogDescription>
              קיימת התנגשות בין נתונים קיימים במערכת לבין נתונים בקובץ הייבוא.
              בחר כיצד לטפל בהתנגשות זו.
            </DialogDescription>
          </DialogHeader>
          
          {renderConflictDetails()}
          
          <DialogFooter className="space-x-2 space-x-reverse">
            <Button variant="outline" onClick={() => resolveCurrentConflict('keep')}>
              <Check className="h-4 w-4 ms-2" />
              שמור על הנתונים הקיימים
            </Button>
            <Button onClick={() => resolveCurrentConflict('overwrite')}>
              <X className="h-4 w-4 ms-2" />
              דרוס בנתונים החדשים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataManagement;
