import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DateRangeSelector from './DateRangeSelector';
import TableSelector from './TableSelector';
import { useExportData } from '@/lib/data-export/useExportData';
import { supabase } from '@/lib/supabase';

// Define available table names as a type
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

const ExportDataTab = () => {
  const [exportStartDate, setExportStartDate] = useState<Date | undefined>(undefined);
  const [exportEndDate, setExportEndDate] = useState<Date | undefined>(undefined);
  
  // Tables to export - updated with all current tables
  const [selectedTables, setSelectedTables] = useState<Record<string, boolean>>({
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

  const { isExporting, handleExport, downloadExportData } = useExportData();

  const onExport = async () => {
    try {
      const exportData = await handleExport({ 
        exportStartDate, 
        exportEndDate, 
        selectedTables 
      });
      downloadExportData(exportData, exportStartDate, exportEndDate);
    } catch (error) {
      // Error is already handled in useExportData
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DateRangeSelector 
          exportStartDate={exportStartDate}
          exportEndDate={exportEndDate}
          setExportStartDate={setExportStartDate}
          setExportEndDate={setExportEndDate}
          disabled={isExporting}
        />
        
        <TableSelector 
          selectedTables={selectedTables}
          setSelectedTables={setSelectedTables}
          disabled={isExporting}
        />
      </div>

      <div className="flex justify-end mt-4">
        <Button 
          onClick={onExport} 
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
