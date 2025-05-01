import React, { useState } from 'react';
import { format } from 'date-fns';
import { Download, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

type ValidTableName = 
  "show_items" | 
  "shows_backup" | 
  "interviewees" | 
  "schedule_slots_old" | 
  "schedule_slots" |
  "day_notes" | 
  "email_settings" | 
  "email_recipients" |
  "whatsapp_settings" |
  "show_whatsapp_logs" |
  "work_arrangements" |
  "digital_work_arrangements" |
  "digital_shifts" |
  "digital_shift_custom_rows" |
  "digital_employees" |
  "show_email_logs" | 
  "system_settings" | 
  "users" |
  "workers";

// Helper function to execute a SQL query directly for tables that might not be in TypeScript definitions
const executeTableQuery = async (tableName: string, filters: Record<string, any> = {}) => {
  try {
    // Build a dynamic query using the from method with type assertion
    let query = supabase
      .from(tableName as any)
      .select('*');
    
    // Add filters if they exist
    if (Object.keys(filters).length > 0) {
      for (const [key, value] of Object.entries(filters)) {
        if (Array.isArray(value)) {
          // For IN conditions
          query = (query as any).in(key, value);
        } else {
          // For equality conditions
          query = (query as any).eq(key, value);
        }
      }
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error executing query for ${tableName}:`, error);
    throw error;
  }
};

const ExportDataTab = () => {
  const { toast } = useToast();
  const [exportStartDate, setExportStartDate] = useState<Date | undefined>(undefined);
  const [exportEndDate, setExportEndDate] = useState<Date | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);
  
  // Tables to export - updated with all current tables
  const [selectedTables, setSelectedTables] = useState({
    shows_backup: true,
    show_items: true,
    interviewees: true,
    schedule_slots_old: true,
    schedule_slots: true, 
    day_notes: true,
    workers: true, 
    email_settings: false,
    email_recipients: false,
    whatsapp_settings: false,
    show_email_logs: false,
    show_whatsapp_logs: false,
    work_arrangements: false,
    digital_work_arrangements: false,
    digital_shifts: false,
    digital_shift_custom_rows: false,
    digital_employees: false,
    system_settings: false,
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
        try {
          let showsQuery = supabase.from('shows_backup').select('id');
          
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
            const { data: filteredItems, error: itemsError } = await (supabase
              .from('show_items') as any)
              .select('id')
              .in('show_id', filteredShowIds);
              
            if (itemsError) {
              throw new Error(`Error filtering show items: ${itemsError.message}`);
            }
            
            filteredShowItemIds = filteredItems?.map(item => item.id) || [];
          }
        } catch (error: any) {
          console.error('Error preparing filtered IDs:', error);
          toast({
            title: 'שגיאה בהכנת מסנני תאריכים',
            description: error.message,
            variant: 'destructive',
          });
        }
      }
      
      // Process each selected table
      for (const tableName of tables) {
        try {
          let tableData: any[] = [];
          
          // Handle tables that need special filtering
          if (exportStartDate || exportEndDate) {
            if (tableName === 'shows_backup') {
              // Shows are filtered directly by date
              let query = supabase.from('shows_backup').select('*');
              
              if (exportStartDate) {
                const formattedStartDate = format(exportStartDate, 'yyyy-MM-dd');
                query = query.gte('date', formattedStartDate);
              }
              
              if (exportEndDate) {
                const formattedEndDate = format(exportEndDate, 'yyyy-MM-dd');
                query = query.lte('date', formattedEndDate);
              }
              
              const { data, error } = await query;
              if (error) throw error;
              tableData = data || [];
            } 
            else if (tableName === 'work_arrangements' || tableName === 'digital_work_arrangements') {
              // Work arrangements are filtered by week_start
              const { data, error } = await (supabase
                .from(tableName)
                .select('*') as any);
              
              if (error) throw error;
              
              // Filter in memory to handle date comparisons reliably
              if (data) {
                tableData = data.filter(item => {
                  const itemDate = new Date(item.week_start);
                  return (!exportStartDate || itemDate >= exportStartDate) && 
                         (!exportEndDate || itemDate <= exportEndDate);
                });
              }
            }
            else if ((tableName === 'show_items' || tableName === 'show_email_logs' || tableName === 'show_whatsapp_logs') && filteredShowIds.length > 0) {
              // For tables that reference show_id
              tableData = await executeTableQuery(tableName, { show_id: filteredShowIds });
            }
            else if (tableName === 'interviewees' && filteredShowItemIds.length > 0) {
              // Interviewees reference item_id
              tableData = await executeTableQuery(tableName, { item_id: filteredShowItemIds });
            }
            else if (tableName === 'whatsapp_settings') {
              // Special case for whatsapp_settings - no date filtering
              tableData = await executeTableQuery(tableName);
            }
            else {
              // For tables with no specific filtering
              tableData = await executeTableQuery(tableName);
            }
          } else {
            // No date filtering - simple query for all tables
            tableData = await executeTableQuery(tableName);
          }
          
          exportData[tableName] = tableData;
        } catch (error: any) {
          console.error(`Error exporting ${tableName}:`, error);
          toast({
            title: `שגיאה בטבלה ${tableName}`,
            description: error.message,
            variant: "destructive",
          });
          // Continue with the next table
          exportData[tableName] = [];
        }
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
