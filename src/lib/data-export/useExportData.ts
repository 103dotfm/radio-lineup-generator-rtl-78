import { useState } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import executeTableQuery from './executeTableQuery';

export interface ExportSettings {
  exportStartDate?: Date;
  exportEndDate?: Date;
  selectedTables: Record<string, boolean>;
}

export const useExportData = () => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async ({ exportStartDate, exportEndDate, selectedTables }: ExportSettings) => {
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
          let showsQuery = supabase.from('schedule_slots').select('id');
          
          if (exportStartDate) {
            const formattedStartDate = format(exportStartDate, 'yyyy-MM-dd');
            showsQuery = showsQuery.gte('created_at', formattedStartDate);
          }
          
          if (exportEndDate) {
            const formattedEndDate = format(exportEndDate, 'yyyy-MM-dd');
            showsQuery = showsQuery.lte('created_at', formattedEndDate);
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
      
      return exportData;
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "שגיאה בייצוא נתונים",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  const downloadExportData = (exportData: Record<string, any[]>, exportStartDate?: Date, exportEndDate?: Date) => {
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
  };

  return {
    isExporting,
    handleExport,
    downloadExportData
  };
};

// Import needed at the top but defined here to avoid circular dependencies
import { supabase } from '@/lib/supabase';
