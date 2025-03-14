import React, { useState } from 'react';
import { format } from 'date-fns';
import { Download, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';

type ValidTableName = "shows" | "show_items" | "interviewees" | "schedule_slots" | 
  "day_notes" | "email_settings" | "email_recipients" | "work_arrangements" | 
  "show_email_logs" | "system_settings" | "users";

const ExportDataTab = () => {
  const { toast } = useToast();
  const [exportStartDate, setExportStartDate] = useState<Date | undefined>(undefined);
  const [exportEndDate, setExportEndDate] = useState<Date | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);
  
  // Tables to export
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
          // Need to cast to any before using .in()
          const queryBuilder = supabase
            .from('show_items' as ValidTableName)
            .select('id');
          
          // Cast queryBuilder to any before calling .in()
          const { data: filteredItems, error: itemsError } = await (queryBuilder as any)
            .in('show_id', filteredShowIds);
            
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
            // Cast query to any before calling .in()
            query = (query as any).in('show_id', filteredShowIds);
          }
          else if (tableName === 'interviewees' && filteredShowItemIds.length > 0) {
            // Cast query to any before calling .in()
            query = (query as any).in('item_id', filteredShowItemIds);
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

  return (
    <div className="space-y-4">
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

      <div className="flex justify-end mt-4">
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
      </div>
    </div>
  );
};

export default ExportDataTab;
