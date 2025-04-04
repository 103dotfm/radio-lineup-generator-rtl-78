import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Pencil, Trash2, MoreVertical, MoveVertical } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import WorkerSelector from '@/components/schedule/workers/WorkerSelector';

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
  comic_prompt: string | null;
}

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

const DigitalWorkArrangement: React.FC = () => {
  const [arrangement, setArrangement] = useState<WorkArrangement | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [customRows, setCustomRows] = useState<CustomRow[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [weekDate, setWeekDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState(SECTION_NAMES.DIGITAL_SHIFTS);
  const [comicPromptDialogOpen, setComicPromptDialogOpen] = useState(false);
  const [comicPrompt, setComicPrompt] = useState('');
  const [footerTextDialogOpen, setFooterTextDialogOpen] = useState(false);
  const [footerText, setFooterText] = useState('');

  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editingCustomRow, setEditingCustomRow] = useState<CustomRow | null>(null);
  const [newShiftData, setNewShiftData] = useState({
    section_name: SECTION_NAMES.DIGITAL_SHIFTS,
    day_of_week: 0,
    shift_type: SHIFT_TYPES.MORNING,
    start_time: '09:00',
    end_time: '12:00',
    person_name: '',
    additional_text: '',
    is_custom_time: false,
    is_hidden: false
  });
  const [newCustomRowData, setNewCustomRowData] = useState({
    section_name: SECTION_NAMES.DIGITAL_SHIFTS,
    contents: {} as Record<number, string>
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchArrangement();
  }, [weekDate]);

  const fetchArrangement = async () => {
    setIsLoadingData(true);
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
        setComicPrompt(firstArrangement.comic_prompt || '');
        setFooterText(firstArrangement.footer_text || '');
        
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('digital_shifts')
          .select('*')
          .eq('arrangement_id', firstArrangement.id)
          .order('position', { ascending: true });
        
        if (shiftsError) {
          throw shiftsError;
        }
        
        const { data: customRowsData, error: customRowsError } = await supabase
          .from('digital_shift_custom_rows')
          .select('*')
          .eq('arrangement_id', firstArrangement.id)
          .order('position', { ascending: true });
        
        if (customRowsError) {
          throw customRowsError;
        }
        
        const processedCustomRows = (customRowsData || []).map(row => {
          const contents: Record<number, string> = {};
          
          try {
            if (row.contents) {
              const parsedContents = typeof row.contents === 'string' 
                ? JSON.parse(row.contents) 
                : row.contents;
              
              for (let i = 0; i < 6; i++) {
                contents[i] = (parsedContents[i] || '').toString();
              }
            } else if (row.content) {
              for (let i = 0; i < 6; i++) {
                contents[i] = row.content;
              }
            }
          } catch (e) {
            console.error('Error parsing custom row contents:', e);
          }
          
          return {
            id: row.id,
            section_name: row.section_name,
            contents: contents,
            position: row.position
          };
        });
        
        setShifts(shiftsData || []);
        setCustomRows(processedCustomRows);
      } else {
        const { data: newArrangement, error: createError } = await supabase
          .from('digital_work_arrangements')
          .insert([{
            week_start: weekStartStr,
            notes: null,
            footer_text: null,
            footer_image_url: null,
            comic_prompt: null
          }])
          .select()
          .single();
        
        if (createError) {
          throw createError;
        }
        
        setArrangement(newArrangement);
        setShifts([]);
        setCustomRows([]);
      }
    } catch (error) {
      console.error('Error fetching digital work arrangement:', error);
      toast({
        title: "Error",
        description: "Could not load the digital work arrangement.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSaveShift = async () => {
    if (!arrangement) return;
    
    try {
      if (editingShift) {
        const { error } = await supabase
          .from('digital_shifts')
          .update({
            section_name: newShiftData.section_name,
            day_of_week: newShiftData.day_of_week,
            shift_type: newShiftData.shift_type,
            start_time: newShiftData.start_time,
            end_time: newShiftData.end_time,
            person_name: newShiftData.person_name || null,
            additional_text: newShiftData.additional_text || null,
            is_custom_time: newShiftData.is_custom_time,
            is_hidden: newShiftData.is_hidden
          })
          .eq('id', editingShift.id);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Shift updated successfully"
        });
      } else {
        const position = shifts
          .filter(s => s.section_name === newShiftData.section_name && 
                       s.day_of_week === newShiftData.day_of_week && 
                       s.shift_type === newShiftData.shift_type)
          .length;
        
        const { data, error } = await supabase
          .from('digital_shifts')
          .insert({
            arrangement_id: arrangement.id,
            section_name: newShiftData.section_name,
            day_of_week: newShiftData.day_of_week,
            shift_type: newShiftData.shift_type,
            start_time: newShiftData.start_time,
            end_time: newShiftData.end_time,
            person_name: newShiftData.person_name || null,
            additional_text: newShiftData.additional_text || null,
            is_custom_time: newShiftData.is_custom_time,
            is_hidden: newShiftData.is_hidden,
            position: position
          })
          .select();
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "New shift created successfully"
        });
      }
      
      fetchArrangement();
      setShiftDialogOpen(false);
    } catch (error) {
      console.error('Error saving shift:', error);
      toast({
        title: "Error",
        description: "Failed to save shift",
        variant: "destructive"
      });
    }
  };

  const handleSaveCustomRow = async () => {
    if (!arrangement) return;
    
    try {
      if (editingCustomRow) {
        const { error } = await supabase
          .from('digital_shift_custom_rows')
          .update({
            section_name: newCustomRowData.section_name,
            contents: newCustomRowData.contents
          })
          .eq('id', editingCustomRow.id);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Custom row updated successfully"
        });
      } else {
        const position = customRows
          .filter(r => r.section_name === newCustomRowData.section_name)
          .length;
        
        const { error } = await supabase
          .from('digital_shift_custom_rows')
          .insert({
            arrangement_id: arrangement.id,
            section_name: newCustomRowData.section_name,
            contents: newCustomRowData.contents,
            position: position
          });
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "New custom row created successfully"
        });
      }
      
      fetchArrangement();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving custom row:', error);
      toast({
        title: "Error",
        description: "Failed to save custom row",
        variant: "destructive"
      });
    }
  };

  const handleDeleteShift = async (id: string) => {
    try {
      const { error } = await supabase
        .from('digital_shifts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setShifts(shifts.filter(shift => shift.id !== id));
      toast({
        title: "Success",
        description: "Shift deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast({
        title: "Error",
        description: "Failed to delete shift",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCustomRow = async (id: string) => {
    try {
      const { error } = await supabase
        .from('digital_shift_custom_rows')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setCustomRows(customRows.filter(row => row.id !== id));
      toast({
        title: "Success",
        description: "Custom row deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting custom row:', error);
      toast({
        title: "Error",
        description: "Failed to delete custom row",
        variant: "destructive"
      });
    }
  };

  const handleSaveComicPrompt = async () => {
    if (!arrangement) return;
    
    try {
      const { error } = await supabase
        .from('digital_work_arrangements')
        .update({ comic_prompt: comicPrompt })
        .eq('id', arrangement.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Comic prompt updated successfully"
      });
      setComicPromptDialogOpen(false);
    } catch (error) {
      console.error('Error updating comic prompt:', error);
      toast({
        title: "Error",
        description: "Failed to update comic prompt",
        variant: "destructive"
      });
    }
  };

  const handleSaveFooterText = async () => {
    if (!arrangement) return;
    
    try {
      const { error } = await supabase
        .from('digital_work_arrangements')
        .update({ footer_text: footerText })
        .eq('id', arrangement.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Footer text updated successfully"
      });
      setFooterTextDialogOpen(false);
    } catch (error) {
      console.error('Error updating footer text:', error);
      toast({
        title: "Error",
        description: "Failed to update footer text",
        variant: "destructive"
      });
    }
  };

  const openShiftDialog = (shift?: Shift) => {
    if (shift) {
      setEditingShift(shift);
      setNewShiftData({
        section_name: shift.section_name,
        day_of_week: shift.day_of_week,
        shift_type: shift.shift_type,
        start_time: shift.start_time,
        end_time: shift.end_time,
        person_name: shift.person_name || '',
        additional_text: shift.additional_text || '',
        is_custom_time: shift.is_custom_time,
        is_hidden: shift.is_hidden
      });
    } else {
      setEditingShift(null);
      setNewShiftData({
        section_name: currentSection,
        day_of_week: 0,
        shift_type: SHIFT_TYPES.MORNING,
        start_time: '09:00',
        end_time: '12:00',
        person_name: '',
        additional_text: '',
        is_custom_time: false,
        is_hidden: false
      });
    }
    setShiftDialogOpen(true);
  };

  const openCustomRowDialog = (row?: CustomRow) => {
    if (row) {
      setEditingCustomRow(row);
      setNewCustomRowData({
        section_name: row.section_name,
        contents: { ...row.contents }
      });
    } else {
      setEditingCustomRow(null);
      const contents: Record<number, string> = {};
      for (let i = 0; i < 6; i++) {
        contents[i] = '';
      }
      setNewCustomRowData({
        section_name: currentSection,
        contents: contents
      });
    }
    setDialogOpen(true);
  };

  const handleShiftPersonChange = (shiftId: string, personId: string | null, additionalText?: string) => {
    const updatedShifts = shifts.map(shift => {
      if (shift.id === shiftId) {
        return {
          ...shift,
          person_name: personId,
          additional_text: additionalText || shift.additional_text
        };
      }
      return shift;
    });
    
    setShifts(updatedShifts);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">עורך סידור עבודה דיגיטל</h2>
        <div className="flex items-center gap-2">
          <DatePicker 
            date={weekDate}
            onSelect={(date) => date && setWeekDate(date)}
          />
        </div>
      </div>

      {isLoadingData ? (
        <div className="flex justify-center my-8">
          <p>טוען נתונים...</p>
        </div>
      ) : (
        <>
          <div className="flex space-x-2 space-x-reverse">
            <Button
              variant={currentSection === SECTION_NAMES.DIGITAL_SHIFTS ? "default" : "outline"}
              onClick={() => setCurrentSection(SECTION_NAMES.DIGITAL_SHIFTS)}
            >
              משמרות דיגיטל
            </Button>
            <Button
              variant={currentSection === SECTION_NAMES.RADIO_NORTH ? "default" : "outline"}
              onClick={() => setCurrentSection(SECTION_NAMES.RADIO_NORTH)}
            >
              רדיו צפון
            </Button>
            <Button
              variant={currentSection === SECTION_NAMES.TRANSCRIPTION_SHIFTS ? "default" : "outline"}
              onClick={() => setCurrentSection(SECTION_NAMES.TRANSCRIPTION_SHIFTS)}
            >
              משמרות תמלולים
            </Button>
            <Button
              variant={currentSection === SECTION_NAMES.LIVE_SOCIAL_SHIFTS ? "default" : "outline"}
              onClick={() => setCurrentSection(SECTION_NAMES.LIVE_SOCIAL_SHIFTS)}
            >
              משמרות לייבים
            </Button>
          </div>

          <div className="flex space-x-2 space-x-reverse">
            <Button onClick={() => openShiftDialog()}>
              <PlusCircle className="ml-2 h-4 w-4" />
              הוספת משמרת
            </Button>
            <Button onClick={() => openCustomRowDialog()}>
              <PlusCircle className="ml-2 h-4 w-4" />
              הוספת שורה מותאמת
            </Button>
            <Button onClick={() => setComicPromptDialogOpen(true)}>
              {arrangement?.comic_prompt ? 'עריכת פרומפט קומיקס' : 'הוספת פרומפט קומיקס'}
            </Button>
            <Button onClick={() => setFooterTextDialogOpen(true)}>
              {arrangement?.footer_text ? 'עריכת טקסט תחתון' : 'הוספת טקסט תחתון'}
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">משמרות</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>סוג</TableHead>
                    <TableHead>יום</TableHead>
                    <TableHead>שעות</TableHead>
                    <TableHead>שם</TableHead>
                    <TableHead>טקסט נוסף</TableHead>
                    <TableHead>פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts
                    .filter(shift => shift.section_name === currentSection)
                    .map((shift) => (
                      <TableRow key={shift.id} className={shift.is_hidden ? "opacity-50" : ""}>
                        <TableCell>{shift.shift_type}</TableCell>
                        <TableCell>{shift.day_of_week}</TableCell>
                        <TableCell>
                          {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                        </TableCell>
                        <TableCell>{shift.person_name || '-'}</TableCell>
                        <TableCell>{shift.additional_text || '-'}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openShiftDialog(shift)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                עריכה
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteShift(shift.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                מחיקה
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">שורות מותאמות</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>תוכן ימים</TableHead>
                    <TableHead>פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customRows
                    .filter(row => row.section_name === currentSection)
                    .map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="grid grid-cols-6 gap-2">
                            {[0, 1, 2, 3, 4, 5].map((day) => (
                              <div key={day} className="text-center">
                                {row.contents[day] || '-'}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openCustomRowDialog(row)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                עריכה
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteCustomRow(row.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                מחיקה
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <MoveVertical className="mr-2 h-4 w-4" />
                                שינוי סדר
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
            <DialogContent className="sm:max-w-[425px]" dir="rtl">
              <DialogHeader>
                <DialogTitle>
                  {editingShift ? 'עריכת משמרת' : 'הוספת משמרת חדשה'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="shift-section">סקשן</Label>
                  <Select
                    value={newShiftData.section_name}
                    onValueChange={(value) => setNewShiftData({...newShiftData, section_name: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="בחר סקשן" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SECTION_NAMES.DIGITAL_SHIFTS}>משמרות דיגיטל</SelectItem>
                      <SelectItem value={SECTION_NAMES.RADIO_NORTH}>רדיו צפון</SelectItem>
                      <SelectItem value={SECTION_NAMES.TRANSCRIPTION_SHIFTS}>משמרות תמלולים</SelectItem>
                      <SelectItem value={SECTION_NAMES.LIVE_SOCIAL_SHIFTS}>משמרות לייבים</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="shift-day">יום</Label>
                  <Select
                    value={newShiftData.day_of_week.toString()}
                    onValueChange={(value) => setNewShiftData({...newShiftData, day_of_week: parseInt(value)})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="בחר יום" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">ראשון</SelectItem>
                      <SelectItem value="1">שני</SelectItem>
                      <SelectItem value="2">שלישי</SelectItem>
                      <SelectItem value="3">רביעי</SelectItem>
                      <SelectItem value="4">חמישי</SelectItem>
                      <SelectItem value="5">שישי</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="shift-type">סוג משמרת</Label>
                  <Select
                    value={newShiftData.shift_type}
                    onValueChange={(value) => setNewShiftData({...newShiftData, shift_type: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="בחר סוג משמרת" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SHIFT_TYPES.MORNING}>בוקר</SelectItem>
                      <SelectItem value={SHIFT_TYPES.AFTERNOON}>צהריים</SelectItem>
                      <SelectItem value={SHIFT_TYPES.EVENING}>ערב</SelectItem>
                      <SelectItem value={SHIFT_TYPES.CUSTOM}>מותאם אישית</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="start-time">שעת התחלה</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={newShiftData.start_time}
                    onChange={(e) => setNewShiftData({...newShiftData, start_time: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="end-time">שעת סיום</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={newShiftData.end_time}
                    onChange={(e) => setNewShiftData({...newShiftData, end_time: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="person-name">שם</Label>
                  <div className="col-span-3">
                    <WorkerSelector 
                      value={newShiftData.person_name || null}
                      onChange={(value, additionalText) => 
                        setNewShiftData({
                          ...newShiftData, 
                          person_name: value || '', 
                          additional_text: additionalText || ''
                        })
                      }
                      additionalText={newShiftData.additional_text}
                      placeholder="בחר עובד..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="additional-text">טקסט נוסף</Label>
                  <Input
                    id="additional-text"
                    value={newShiftData.additional_text}
                    onChange={(e) => setNewShiftData({...newShiftData, additional_text: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="is-custom-time" 
                    checked={newShiftData.is_custom_time}
                    onCheckedChange={(checked) => 
                      setNewShiftData({...newShiftData, is_custom_time: checked === true})
                    }
                  />
                  <Label htmlFor="is-custom-time">שעו�� מותאמות אישית</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="is-hidden" 
                    checked={newShiftData.is_hidden}
                    onCheckedChange={(checked) => 
                      setNewShiftData({...newShiftData, is_hidden: checked === true})
                    }
                  />
                  <Label htmlFor="is-hidden">הסתר משמרת</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={handleSaveShift}>שמור</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-[600px]" dir="rtl">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomRow ? 'עריכת שורה מותאמת' : 'הוספת שורה מותאמת'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="row-section">סקשן</Label>
                  <Select
                    value={newCustomRowData.section_name}
                    onValueChange={(value) => setNewCustomRowData({...newCustomRowData, section_name: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="בחר סקשן" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SECTION_NAMES.DIGITAL_SHIFTS}>משמרות דיגיטל</SelectItem>
                      <SelectItem value={SECTION_NAMES.RADIO_NORTH}>רדיו צפון</SelectItem>
                      <SelectItem value={SECTION_NAMES.TRANSCRIPTION_SHIFTS}>משמרות תמלולים</SelectItem>
                      <SelectItem value={SECTION_NAMES.LIVE_SOCIAL_SHIFTS}>משמרות לייבים</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="mb-2 block">תוכן לימים בשבוע</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {[0, 1, 2, 3, 4, 5].map((day) => (
                      <div key={day} className="space-y-1">
                        <Label className="text-center block">
                          {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'][day]}
                        </Label>
                        <Input
                          value={newCustomRowData.contents[day] || ''}
                          onChange={(e) => {
                            const newContents = {...newCustomRowData.contents};
                            newContents[day] = e.target.value;
                            setNewCustomRowData({...newCustomRowData, contents: newContents});
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={handleSaveCustomRow}>שמור</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={comicPromptDialogOpen} onOpenChange={setComicPromptDialogOpen}>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>פרומפט קומיקס</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Textarea
                  placeholder="הזן פרומפט לקומיקס..."
                  className="min-h-[200px]"
                  value={comicPrompt}
                  onChange={(e) => setComicPrompt(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="button" onClick={handleSaveComicPrompt}>שמור</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={footerTextDialogOpen} onOpenChange={setFooterTextDialogOpen}>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>טקסט תחתון</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Textarea
                  placeholder="הזן טקסט תחתון..."
                  className="min-h-[200px]"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="button" onClick={handleSaveFooterText}>שמור</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default DigitalWorkArrangement;
