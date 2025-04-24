
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

export function ScheduleExportOffset() {
  const [offset, setOffset] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentOffset();
  }, []);

  const loadCurrentOffset = async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'schedule_data_offset')
      .single();

    if (!error && data) {
      setOffset(parseInt(data.value) || 0);
    }
  };

  const previewData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('generate-schedule-xml', {
        body: { previewOffset: offset }
      });
      
      // Extract and format the first few shows for preview
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data, "text/xml");
      const shows = xmlDoc.getElementsByTagName("show");
      let previewText = "### Preview of first 3 shows with offset:\n\n";
      
      for (let i = 0; i < Math.min(shows.length, 3); i++) {
        const show = shows[i];
        const date = show.getElementsByTagName("date")[0]?.textContent;
        const startTime = show.getElementsByTagName("start_time")[0]?.textContent;
        const combinedName = show.getElementsByTagName("combined")[0]?.textContent;
        
        previewText += `${date || 'N/A'} - ${startTime || 'N/A'} - ${combinedName || 'N/A'}\n`;
      }
      
      setPreview(previewText);
    } catch (error) {
      console.error('Error previewing data:', error);
      toast({
        variant: "destructive",
        title: "Error previewing data",
        description: "Failed to generate preview with the new offset."
      });
    } finally {
      setLoading(false);
    }
  };

  const saveOffset = async () => {
    setLoading(true);
    try {
      // Save offset setting
      const { error: settingError } = await supabase
        .from('system_settings')
        .upsert({
          key: 'schedule_data_offset',
          value: offset.toString(),
          updated_at: new Date().toISOString()
        });

      if (settingError) throw settingError;

      // Generate new XML and JSON with the offset
      await Promise.all([
        supabase.functions.invoke('generate-schedule-xml'),
        supabase.functions.invoke('generate-schedule-json')
      ]);

      toast({
        title: "Settings saved",
        description: "Schedule data offset updated and files regenerated."
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: "destructive",
        title: "Error saving settings",
        description: "Failed to save offset settings."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Schedule Data Offset</h3>
      <p className="text-sm text-gray-600">
        Adjust the data offset (in days) to control which shows appear in the XML/JSON exports.
        Current server time: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}
      </p>
      
      <div className="flex items-center gap-4">
        <Input
          type="number"
          value={offset}
          onChange={(e) => setOffset(parseInt(e.target.value) || 0)}
          className="w-32"
          placeholder="Offset (days)"
        />
        <Button 
          onClick={previewData} 
          variant="outline"
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Preview
        </Button>
        <Button 
          onClick={saveOffset}
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save & Update Files
        </Button>
      </div>

      {preview && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <pre className="text-sm whitespace-pre-wrap">{preview}</pre>
        </div>
      )}
    </div>
  );
}
