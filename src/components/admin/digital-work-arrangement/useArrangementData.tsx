
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Shift, CustomRow, WorkArrangement } from './types';

export const useArrangementData = (weekDate: Date) => {
  const [arrangement, setArrangement] = useState<WorkArrangement | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [customRows, setCustomRows] = useState<CustomRow[]>([]);
  const [footerText, setFooterText] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchArrangement = async () => {
    setLoading(true);
    const weekStartStr = format(weekDate, 'yyyy-MM-dd');
    
    try {
      const { data: arrangementData, error: arrangementError } = await supabase
        .from('digital_work_arrangements')
        .select('*')
        .eq('week_start', weekStartStr);
      
      if (arrangementError) {
        throw arrangementError;
      }
      
      if (arrangementData && arrangementData.length > 0) {
        const firstArrangement = arrangementData[0];
        setArrangement(firstArrangement);
        setFooterText(firstArrangement.footer_text || '');
        
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('digital_shifts')
          .select('*')
          .eq('arrangement_id', firstArrangement.id)
          .order('position', { ascending: true });
        
        if (shiftsError) {
          throw shiftsError;
        }
        
        setShifts(shiftsData || []);
        
        const { data: customRowsData, error: customRowsError } = await supabase
          .from('digital_shift_custom_rows')
          .select('*')
          .eq('arrangement_id', firstArrangement.id)
          .order('position', { ascending: true });
          
        if (customRowsError) {
          throw customRowsError;
        }
        
        const processedCustomRows = customRowsData?.map(row => {
          let contents: Record<number, string> = {};
          
          try {
            if (row.contents) {
              if (typeof row.contents === 'string') {
                try {
                  contents = JSON.parse(row.contents);
                } catch {
                  contents = {};
                }
              } else if (typeof row.contents === 'object') {
                Object.entries(row.contents).forEach(([key, value]) => {
                  if (value !== null && value !== undefined) {
                    contents[Number(key)] = String(value);
                  } else {
                    contents[Number(key)] = '';
                  }
                });
              }
            }
          } catch (e) {
            console.error('Error parsing contents', e);
          }
          
          return {
            id: row.id,
            section_name: row.section_name,
            contents: contents,
            position: row.position
          };
        }) || [];
        
        setCustomRows(processedCustomRows);
      } else {
        const { data: newArrangement, error: createError } = await supabase
          .from('digital_work_arrangements')
          .insert([{
            week_start: weekStartStr,
            notes: null,
            footer_text: null,
            footer_image_url: null
          }])
          .select()
          .single();
        
        if (createError) {
          throw createError;
        }
        
        setArrangement(newArrangement);
        setShifts([]);
        setCustomRows([]);
        setFooterText('');
      }
    } catch (error) {
      console.error('Error fetching digital work arrangement:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את סידור העבודה",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArrangement();
  }, [weekDate]);

  return {
    arrangement,
    shifts,
    customRows,
    footerText,
    loading,
    setArrangement,
    setShifts,
    setCustomRows,
    setFooterText,
    refreshData: fetchArrangement
  };
};
