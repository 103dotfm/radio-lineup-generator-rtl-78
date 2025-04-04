
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
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [arrangement, setArrangement] = useState<WorkArrangement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState<string>('');
  const [footerText, setFooterText] = useState<string>('');
  const [footerImageUrl, setFooterImageUrl] = useState<string>('');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [customRows, setCustomRows] = useState<CustomRow[]>([]);
  
  const { toast } = useToast();
  
  useEffect(() => {
    fetchArrangement();
  }, [currentWeek]);
  
  const fetchArrangement = async () => {
    setIsLoading(true);
    const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
    
    try {
      // Check if arrangement exists for this week
      const { data: existingArrangement, error: fetchError } = await supabase
        .from('digital_work_arrangements')
        .select('*')
        .eq('week_start', weekStartStr)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
        throw fetchError;
      }
      
      if (existingArrangement) {
        // Fetch shifts
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('digital_shifts')
          .select('*')
          .eq('arrangement_id', existingArrangement.id)
          .order('position', { ascending: true });
          
        if (shiftsError) throw shiftsError;
        
        // Fetch custom rows
        const { data: customRowsData, error: customRowsError } = await supabase
          .from('digital_shift_custom_rows')
          .select('*')
          .eq('arrangement_id', existingArrangement.id)
          .order('position', { ascending: true });
          
        if (customRowsError) throw customRowsError;
        
        setArrangement({
          ...existingArrangement,
          shifts: shiftsData || [],
          custom_rows: customRowsData || []
        });
        
        setNotes(existingArrangement.notes || '');
        setFooterText(existingArrangement.footer_text || '');
        setFooterImageUrl(existingArrangement.footer_image_url || '');
        setShifts(shiftsData || []);
        setCustomRows(customRowsData || []);
      } else {
        // Create default arrangement
        setArrangement(null);
        setNotes('');
        setFooterText('');
        setFooterImageUrl('');
        setShifts(generateDefaultShifts());
        setCustomRows([]);
      }
    } catch (error) {
      console.error('Error fetching arrangement:', error);
      toast({
        title: "שגיאה בטעינת סידור העבודה",
        description: "אירעה שגיאה בעת טעינת סידור העבודה",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate default shifts for a new arrangement
  const generateDefaultShifts = (): Shift[] => {
    const defaultShifts: Shift[] = [];
    let position = 0;
    
    // Digital Shifts Section
    Object.values(SHIFT_TYPES).forEach(shiftType => {
      if (shiftType !== SHIFT_TYPES.CUSTOM && DEFAULT_SHIFTS[SECTION_NAMES.DIGITAL_SHIFTS][shiftType]) {
        const shiftConfig = DEFAULT_SHIFTS[SECTION_NAMES.DIGITAL_SHIFTS][shiftType];
        
        for (let day = 0; day < 6; day++) {
          // Skip Friday evening shift if it doesn't exist
          if (shiftType === SHIFT_TYPES.EVENING && day === 5 && shiftConfig.friday?.exists === false) {
            continue;
          }
          
          let startTime, endTime;
          
          if (shiftType === SHIFT_TYPES.EVENING) {
            // Special handling for evening shifts
            if (day === 4) { // Thursday
              startTime = shiftConfig.thursday.startTime;
              endTime = shiftConfig.thursday.endTime;
            } else if (day === 5) { // Friday
              startTime = shiftConfig.friday?.startTime || '';
              endTime = shiftConfig.friday?.endTime || '';
            } else { // Regular weekday
              startTime = shiftConfig.weekdays.startTime;
              endTime = shiftConfig.weekdays.endTime;
            }
          } else {
            // Regular morning/afternoon shifts
            if (day === 5 && shiftConfig.friday) { // Friday special time
              startTime = shiftConfig.friday.startTime;
              endTime = shiftConfig.friday.endTime;
            } else { // Regular weekday
              const config = shiftConfig.weekdays || shiftConfig;
              startTime = config.startTime;
              endTime = config.endTime;
            }
          }
          
          defaultShifts.push({
            id: `new-${SECTION_NAMES.DIGITAL_SHIFTS}-${shiftType}-${day}-${position}`,
            section_name: SECTION_NAMES.DIGITAL_SHIFTS,
            day_of_week: day,
            shift_type: shiftType,
            start_time: startTime,
            end_time: endTime,
            person_name: null,
            is_custom_time: false,
            is_hidden: false,
            position: position++
          });
        }
      }
    });
    
    // Radio North Section (Optional) - Add if needed
    // For Radio North, we only have one time slot 09:00-12:00 for each day
    for (let day = 0; day < 6; day++) {
      defaultShifts.push({
        id: `new-${SECTION_NAMES.RADIO_NORTH}-default-${day}-${position}`,
        section_name: SECTION_NAMES.RADIO_NORTH,
        day_of_week: day,
        shift_type: 'default',
        start_time: DEFAULT_SHIFTS[SECTION_NAMES.RADIO_NORTH].default.startTime,
        end_time: DEFAULT_SHIFTS[SECTION_NAMES.RADIO_NORTH].default.endTime,
        person_name: null,
        is_custom_time: false,
        is_hidden: false,
        position: position++
      });
    }
    
    // Transcription Shifts Section
    Object.entries(DEFAULT_SHIFTS[SECTION_NAMES.TRANSCRIPTION_SHIFTS]).forEach(([shiftType, shiftConfig]) => {
      for (let day = 0; day < 6; day++) {
        // Skip Friday afternoon if it doesn't exist
        if (shiftType === SHIFT_TYPES.AFTERNOON && day === 5 && shiftConfig.friday?.exists === false) {
          continue;
        }
        
        let startTime, endTime;
        
        if (day === 5 && shiftConfig.friday) { // Friday special time
          if (shiftConfig.friday.exists === false) continue;
          startTime = shiftConfig.friday.startTime;
          endTime = shiftConfig.friday.endTime;
        } else { // Regular weekday
          startTime = shiftConfig.weekdays.startTime;
          endTime = shiftConfig.weekdays.endTime;
        }
        
        defaultShifts.push({
          id: `new-${SECTION_NAMES.TRANSCRIPTION_SHIFTS}-${shiftType}-${day}-${position}`,
          section_name: SECTION_NAMES.TRANSCRIPTION_SHIFTS,
          day_of_week: day,
          shift_type: shiftType,
          start_time: startTime,
          end_time: endTime,
          person_name: null,
          is_custom_time: false,
          is_hidden: false,
          position: position++
        });
      }
    });
    
    // Live Social Shifts Section
    Object.entries(DEFAULT_SHIFTS[SECTION_NAMES.LIVE_SOCIAL_SHIFTS]).forEach(([shiftType, shiftConfig]) => {
      for (let day = 0; day < 6; day++) {
        // Skip Friday afternoon if it doesn't exist
        if (shiftType === SHIFT_TYPES.AFTERNOON && day === 5 && shiftConfig.friday?.exists === false) {
          continue;
        }
        
        let startTime, endTime;
        
        if (day === 5 && shiftConfig.friday) { // Friday special time
          if (shiftConfig.friday.exists === false) continue;
          startTime = shiftConfig.friday.startTime;
          endTime = shiftConfig.friday.endTime;
        } else { // Regular weekday
          startTime = shiftConfig.weekdays.startTime;
          endTime = shiftConfig.weekdays.endTime;
        }
        
        defaultShifts.push({
          id: `new-${SECTION_NAMES.LIVE_SOCIAL_SHIFTS}-${shiftType}-${day}-${position}`,
          section_name: SECTION_NAMES.LIVE_SOCIAL_SHIFTS,
          day_of_week: day,
          shift_type: shiftType,
          start_time: startTime,
          end_time: endTime,
          person_name: null,
          is_custom_time: false,
          is_hidden: false,
          position: position++
        });
      }
    });
    
    return defaultShifts;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else {
      setCurrentWeek(addWeeks(currentWeek, 1));
    }
  };

  // Update a shift's person name
  const updatePersonName = (shiftId: string, name: string | null) => {
    setShifts(currentShifts => 
      currentShifts.map(shift => 
        shift.id === shiftId ? { ...shift, person_name: name } : shift
      )
    );
  };

  // Update a shift's time
  const updateShiftTime = (shiftId: string, startTime: string, endTime: string) => {
    setShifts(currentShifts => 
      currentShifts.map(shift => 
        shift.id === shiftId ? { 
          ...shift, 
          start_time: startTime, 
          end_time: endTime,
          is_custom_time: true 
        } : shift
      )
    );
  };

  // Toggle visibility of a shift
  const toggleShiftVisibility = (shiftId: string) => {
    setShifts(currentShifts => 
      currentShifts.map(shift => 
        shift.id === shiftId ? { ...shift, is_hidden: !shift.is_hidden } : shift
      )
    );
  };

  // Add a custom row to a section
  const addCustomRow = (sectionName: string) => {
    const newPosition = customRows.filter(row => row.section_name === sectionName).length;
    const newRow: CustomRow = {
      id: `new-custom-${Date.now()}`,
      section_name: sectionName,
      content: '',
      position: newPosition
    };
    
    setCustomRows([...customRows, newRow]);
  };

  // Update custom row content
  const updateCustomRowContent = (rowId: string, content: string) => {
    setCustomRows(currentRows => 
      currentRows.map(row => 
        row.id === rowId ? { ...row, content } : row
      )
    );
  };

  // Delete a custom row
  const deleteCustomRow = (rowId: string) => {
    setCustomRows(currentRows => currentRows.filter(row => row.id !== rowId));
  };

  // Save the current arrangement
  const saveArrangement = async () => {
    setIsSaving(true);
    
    try {
      const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
      
      let arrangementId: string;
      
      // Check if arrangement exists for this week
      if (arrangement?.id) {
        // Update existing arrangement
        arrangementId = arrangement.id;
        
        const { error: updateError } = await supabase
          .from('digital_work_arrangements')
          .update({
            notes,
            footer_text: footerText,
            footer_image_url: footerImageUrl
          })
          .eq('id', arrangementId);
          
        if (updateError) throw updateError;
      } else {
        // Create new arrangement
        const { data: newArrangement, error: insertError } = await supabase
          .from('digital_work_arrangements')
          .insert({
            week_start: weekStartStr,
            notes,
            footer_text: footerText,
            footer_image_url: footerImageUrl
          })
          .select()
          .single();
          
        if (insertError) throw insertError;
        if (!newArrangement) throw new Error('Failed to create arrangement');
        
        arrangementId = newArrangement.id;
      }
      
      // Process shifts
      for (const shift of shifts) {
        if (shift.id.startsWith('new-')) {
          // Create new shift
          const { error: shiftError } = await supabase
            .from('digital_shifts')
            .insert({
              arrangement_id: arrangementId,
              section_name: shift.section_name,
              day_of_week: shift.day_of_week,
              shift_type: shift.shift_type,
              start_time: shift.start_time,
              end_time: shift.end_time,
              person_name: shift.person_name,
              is_custom_time: shift.is_custom_time,
              is_hidden: shift.is_hidden,
              position: shift.position
            });
            
          if (shiftError) throw shiftError;
        } else {
          // Update existing shift
          const { error: shiftError } = await supabase
            .from('digital_shifts')
            .update({
              start_time: shift.start_time,
              end_time: shift.end_time,
              person_name: shift.person_name,
              is_custom_time: shift.is_custom_time,
              is_hidden: shift.is_hidden,
              position: shift.position
            })
            .eq('id', shift.id);
            
          if (shiftError) throw shiftError;
        }
      }
      
      // Process custom rows
      // First, delete all existing custom rows for this arrangement to avoid conflicts
      if (!arrangement?.id) {
        const { error: deleteRowsError } = await supabase
          .from('digital_shift_custom_rows')
          .delete()
          .eq('arrangement_id', arrangementId);
          
        if (deleteRowsError) throw deleteRowsError;
      }
      
      // Then insert all current custom rows
      for (const row of customRows) {
        if (row.content) { // Only save rows with content
          if (row.id.startsWith('new-')) {
            // Create new custom row
            const { error: rowError } = await supabase
              .from('digital_shift_custom_rows')
              .insert({
                arrangement_id: arrangementId,
                section_name: row.section_name,
                content: row.content,
                position: row.position
              });
              
            if (rowError) throw rowError;
          } else {
            // Update existing custom row
            const { error: rowError } = await supabase
              .from('digital_shift_custom_rows')
              .update({
                content: row.content,
                position: row.position
              })
              .eq('id', row.id);
              
            if (rowError) throw rowError;
          }
        }
      }
      
      toast({
        title: "סידור העבודה נשמר בהצלחה",
        description: "סידור העבודה נשמר בהצלחה"
      });
      
      // Refresh data to get the latest IDs
      fetchArrangement();
      
    } catch (error) {
      console.error('Error saving arrangement:', error);
      toast({
        title: "שגיאה בשמירת סידור העבודה",
        description: "אירעה שגיאה בעת שמירת סידור העבודה",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Render a section of shifts
  const renderShiftSection = (sectionName: string) => {
    const sectionShifts = shifts.filter(shift => shift.section_name === sectionName);
    const sectionRows = customRows.filter(row => row.section_name === sectionName);
    
    if (sectionShifts.length === 0 && sectionRows.length === 0) {
      return null;
    }
    
    return (
      <div key={sectionName} className="mb-6">
        {SECTION_TITLES[sectionName] && (
          <h3 className="text-lg font-bold mb-2">{SECTION_TITLES[sectionName]}</h3>
        )}
        
        <Table className="digital-work-arrangement">
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/6">שעות</TableHead>
              {DAYS_OF_WEEK.map((day, index) => (
                <TableHead key={index}>{day}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Group shifts by shift type */}
            {Object.values(SHIFT_TYPES).map(shiftType => {
              const typeShifts = sectionShifts.filter(shift => shift.shift_type === shiftType);
              if (typeShifts.length === 0) return null;
              
              // Get first shift for this type to display time
              const firstShift = typeShifts[0];
              const shiftLabel = `${firstShift.start_time.slice(0, 5)}-${firstShift.end_time.slice(0, 5)}`;
              
              return (
                <TableRow key={`${sectionName}-${shiftType}`}>
                  <TableCell className="font-bold">{shiftLabel}</TableCell>
                  
                  {/* Render cells for each day */}
                  {[0, 1, 2, 3, 4, 5].map(dayOfWeek => {
                    const dayShift = typeShifts.find(s => s.day_of_week === dayOfWeek);
                    if (!dayShift) return <TableCell key={dayOfWeek} />;
                    
                    return (
                      <TableCell 
                        key={dayOfWeek} 
                        className={dayShift.is_hidden ? 'opacity-50' : ''}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Input 
                              type="text"
                              value={dayShift.person_name || ''}
                              onChange={e => updatePersonName(dayShift.id, e.target.value)}
                              placeholder="שם העובד"
                              className="flex-1"
                            />
                            
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => toggleShiftVisibility(dayShift.id)}
                              className="h-8 w-8 p-0"
                            >
                              {dayShift.is_hidden ? (
                                <AlertCircle className="h-4 w-4" />
                              ) : (
                                <Edit className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          
                          {!dayShift.is_hidden && (
                            <div className="flex items-center gap-2">
                              <Input 
                                type="time"
                                value={dayShift.start_time}
                                onChange={e => updateShiftTime(
                                  dayShift.id, 
                                  e.target.value, 
                                  dayShift.end_time
                                )}
                                className="w-1/2"
                              />
                              <Input 
                                type="time"
                                value={dayShift.end_time}
                                onChange={e => updateShiftTime(
                                  dayShift.id, 
                                  dayShift.start_time, 
                                  e.target.value
                                )}
                                className="w-1/2"
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
            
            {/* Render custom rows */}
            {sectionRows.map(row => (
              <TableRow key={row.id}>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => deleteCustomRow(row.id)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
                <TableCell colSpan={6}>
                  <Input 
                    type="text"
                    value={row.content || ''}
                    onChange={e => updateCustomRowContent(row.id, e.target.value)}
                    placeholder="תוכן שורה מותאמת אישית"
                    className="w-full"
                  />
                </TableCell>
              </TableRow>
            ))}
            
            {/* Add custom row button */}
            <TableRow>
              <TableCell colSpan={7}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => addCustomRow(sectionName)}
                  className="w-full flex items-center justify-center"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  הוספת שורה מותאמת אישית
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>סידור עבודה דיגיטל</CardTitle>
        <CardDescription>עריכת סידור עבודה לצוות הדיגיטל</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <Button variant="outline" onClick={() => navigateWeek('prev')}>
            <ChevronRight className="mr-2 h-4 w-4" />
            שבוע קודם
          </Button>
          
          <div className="text-lg font-medium">
            שבוע {format(currentWeek, 'dd/MM/yyyy', { locale: he })} - {format(addDays(currentWeek, 6), 'dd/MM/yyyy', { locale: he })}
          </div>
          
          <Button variant="outline" onClick={() => navigateWeek('next')}>
            שבוע הבא
            <ChevronLeft className="ml-2 h-4 w-4" />
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="text-center">
              <div className="mb-2">טוען סידור עבודה...</div>
            </div>
          </div>
        ) : (
          <div className="digital-work-arrangement">
            {/* Notes field */}
            <div className="mb-6">
              <Label htmlFor="notes" className="mb-2 block">הערות כלליות</Label>
              <Textarea 
                id="notes" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הערות כלליות לסידור העבודה"
                className="min-h-[80px]"
              />
            </div>
            
            {/* Shift sections */}
            {renderShiftSection(SECTION_NAMES.DIGITAL_SHIFTS)}
            {renderShiftSection(SECTION_NAMES.RADIO_NORTH)}
            {renderShiftSection(SECTION_NAMES.TRANSCRIPTION_SHIFTS)}
            {renderShiftSection(SECTION_NAMES.LIVE_SOCIAL_SHIFTS)}
            
            {/* Footer section */}
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="footerText" className="mb-2 block">טקסט תחתית</Label>
                <Input 
                  id="footerText" 
                  value={footerText} 
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="טקסט לתצוגה בתחתית סידור העבודה"
                />
              </div>
              
              <div>
                <Label htmlFor="footerImage" className="mb-2 block">קישור לתמונה בתחתית</Label>
                <Input 
                  id="footerImage" 
                  value={footerImageUrl} 
                  onChange={(e) => setFooterImageUrl(e.target.value)}
                  placeholder="URL לתמונה שתוצג בתחתית סידור העבודה"
                />
              </div>
            </div>
            
            <Button 
              onClick={saveArrangement} 
              disabled={isSaving} 
              className="w-full mt-6"
            >
              {isSaving ? 'שומר...' : 'שמירת סידור עבודה'}
              <Save className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DigitalWorkArrangement;
