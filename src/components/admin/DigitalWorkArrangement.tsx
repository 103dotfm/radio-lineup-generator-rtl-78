import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PlusCircle, Trash2, ChevronLeft, ChevronRight, Save, AlertCircle, Edit } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface Shift {
  id: string;
  section_name: string;
  day_of_week: number;
  shift_type: string;
  start_time: string;
  end_time: string;
  person_name: string | null;
  is_custom_time: boolean;
  is_hidden: boolean;
  position: number;
}

interface CustomRow {
  id: string;
  section_name: string;
  content: string | null;
  position: number;
}

interface WorkArrangement {
  id: string;
  week_start: string;
  notes: string | null;
  footer_text: string | null;
  footer_image_url: string | null;
  shifts: Shift[];
  custom_rows: CustomRow[];
}

const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
const DAYS_OF_WEEK_WITH_DATES = ['30/03', '31/03', '01/04', '02/04', '03/04', '04/04'];

const SECTION_NAMES = {
  DIGITAL_SHIFTS: 'digital_shifts',
  RADIO_NORTH: 'radio_north',
  TRANSCRIPTION_SHIFTS: 'transcription_shifts',
  LIVE_SOCIAL_SHIFTS: 'live_social_shifts'
};

const SHIFT_TYPES = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
  CUSTOM: 'custom'
};

const DEFAULT_SHIFTS = {
  [SECTION_NAMES.DIGITAL_SHIFTS]: {
    [SHIFT_TYPES.MORNING]: {
      startTime: '07:00',
      endTime: '12:00'
    },
    [SHIFT_TYPES.AFTERNOON]: {
      startTime: '12:00',
      endTime: '16:00'
    },
    [SHIFT_TYPES.EVENING]: {
      weekdays: {
        startTime: '16:00',
        endTime: '22:00'
      },
      thursday: {
        startTime: '16:00',
        endTime: '21:00'
      },
      friday: {
        exists: false
      }
    }
  },
  [SECTION_NAMES.RADIO_NORTH]: {
    default: {
      startTime: '09:00',
      endTime: '12:00'
    }
  },
  [SECTION_NAMES.TRANSCRIPTION_SHIFTS]: {
    [SHIFT_TYPES.MORNING]: {
      weekdays: {
        startTime: '07:00',
        endTime: '14:00'
      },
      friday: {
        startTime: '08:00',
        endTime: '13:00'
      }
    },
    [SHIFT_TYPES.AFTERNOON]: {
      weekdays: {
        startTime: '14:00',
        endTime: '20:00'
      },
      friday: {
        exists: false
      }
    }
  },
  [SECTION_NAMES.LIVE_SOCIAL_SHIFTS]: {
    [SHIFT_TYPES.MORNING]: {
      weekdays: {
        startTime: '07:00',
        endTime: '14:00'
      },
      friday: {
        startTime: '08:00',
        endTime: '15:00'
      }
    },
    [SHIFT_TYPES.AFTERNOON]: {
      weekdays: {
        startTime: '14:00',
        endTime: '20:00'
      },
      friday: {
        exists: false
      }
    }
  }
};

const SECTION_TITLES = {
  [SECTION_NAMES.DIGITAL_SHIFTS]: '',
  [SECTION_NAMES.RADIO_NORTH]: 'רדיו צפון 12:00-09:00',
  [SECTION_NAMES.TRANSCRIPTION_SHIFTS]: 'משמרות תמלולים וכו\'',
  [SECTION_NAMES.LIVE_SOCIAL_SHIFTS]: 'משמרות לייבים, סושיאל ועוד'
};

const DigitalWorkArrangement = () => {
  // ... keep existing component implementation
};

export default DigitalWorkArrangement;
