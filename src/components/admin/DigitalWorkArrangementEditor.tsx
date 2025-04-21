import React, { useState, useEffect } from 'react';
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, MoreHorizontal, Clock, ChevronLeft, ChevronRight, Calendar, Eye, Printer, Download } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkerSelector } from '@/components/schedule/workers/WorkerSelector';
import { Worker, getWorkers } from '@/lib/supabase/workers';
import { CustomRowColumns } from '@/components/schedule/workers/CustomRowColumns';
import DigitalWorkArrangementView from '@/components/schedule/DigitalWorkArrangementView';
import html2pdf from 'html2pdf.js';

interface Shift {
  id: string;
  section_name: string;
  day_of_week: number;
  shift_type: string;
  start_time: string;
  end_time: string;
  person_name: string | null;
  additional_text: string | null;
  is_custom_time: boolean;
  is_hidden: boolean;
  position: number;
}

interface CustomRow {
  id: string;
  section_name: string;
  contents: Record<number, string>;
  position: number;
}

interface WorkArrangement {
  id: string;
  week_start: string;
  notes: string | null;
  footer_text: string | null;
  footer_image_url: string | null;
}

const SECTION_NAMES = {
  DIGITAL_SHIFTS: 'digital_shifts',
  RADIO_NORTH: 'radio_north',
  TRANSCRIPTION_SHIFTS: 'transcription_shifts',
  LIVE_SOCIAL_SHIFTS: 'live_social_shifts'
};

const SECTION_TITLES = {
  [SECTION_NAMES.DIGITAL_SHIFTS]: 'משמרות דיגיטל',
  [SECTION_NAMES.RADIO_NORTH]: 'רדיו צפון',
  [SECTION_NAMES.TRANSCRIPTION_SHIFTS]: 'משמרות תמלולים',
  [SECTION_NAMES.LIVE_SOCIAL_SHIFTS]: 'משמרות לייבים'
};

const SHIFT_TYPES = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
  CUSTOM: 'custom'
};

const SHIFT_TYPE_LABELS = {
  [SHIFT_TYPES.MORNING]: 'בוקר',
  [SHIFT_TYPES.AFTERNOON]: 'צהריים',
  [SHIFT_TYPES.EVENING]: 'ערב',
  [SHIFT_TYPES.CUSTOM]: 'מותאם אישית'
};

const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

const DEFAULT_SHIFT_TIMES = {
  [SHIFT_TYPES.MORNING]: { start: '09:00', end: '13:00' },
  [SHIFT_TYPES.AFTERNOON]: { start: '13:00', end: '17:00' },
  [SHIFT_TYPES.EVENING]: { start: '17:00', end: '21:00' },
  [SHIFT_TYPES.CUSTOM]: { start: '12:00', end: '15:00' },
};

const DigitalWorkArrangementEditor: React.FC = () => {
  // ... rest of the code remains the same until handleExportPdf function

  const handleExportPdf = async () => {
    const element = document.getElementById('digital-work-arrangement-preview');
    if (!element) return;

    const [{ default: jsPDF }, html2canvas] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);

    const canvas = await html2canvas.default(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#fff',
      logging: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pageWidth;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    let y = 0;
    let remainingHeight = pdfHeight;
    while (remainingHeight > 0) {
      pdf.addImage(
        imgData,
        'PNG',
        0,
        y,
        pdfWidth,
        pdfHeight,
        undefined,
        'FAST'
      );
      remainingHeight -= pageHeight;
      if (remainingHeight > 0) {
        pdf.addPage();
        y = -pageHeight;
      }
    }

    pdf.save(`digital_${format(weekDate, 'dd-MM-yy')}.pdf`);
  };

  // ... rest of the code remains the same
};
