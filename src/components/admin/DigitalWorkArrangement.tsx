
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { format, startOfWeek, addDays } from 'date-fns';

// Import necessary icons from lucide-react
import { ChevronLeft, ChevronRight, Plus, Trash, Edit, Eye, EyeOff, Search, Check, Upload, FileUp, Link } from 'lucide-react';

// Define types for database work arrangements
type DBWorkArrangement = {
  id: string;
  week_start: string;
  created_at?: string;
  updated_at?: string;
  filename: string;
  url: string;
  type: string;
};

// Define our internal work arrangement type
type WorkArrangement = {
  id: string;
  week_start: string;
  arrangement_data?: any;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
  url?: string;
  filename?: string;
};

const DigitalWorkArrangement = () => {
  // State variables
  const [workArrangements, setWorkArrangements] = useState<WorkArrangement[]>([]);
  const [currentArrangement, setCurrentArrangement] = useState<WorkArrangement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [arrangementType, setArrangementType] = useState<string>('digital');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  
  useEffect(() => {
    fetchWorkArrangements();
  }, []);

  useEffect(() => {
    // Find matching arrangement for selected date
    const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    const matchingArrangement = workArrangements.find(arr => arr.week_start === weekStart);
    setCurrentArrangement(matchingArrangement || null);
  }, [selectedDate, workArrangements]);

  const fetchWorkArrangements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('work_arrangements')
        .select('*')
        .order('week_start', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        // Transform data to match our WorkArrangement type
        const transformedData: WorkArrangement[] = data.map((item: DBWorkArrangement) => ({
          id: item.id,
          week_start: item.week_start,
          created_at: item.created_at,
          updated_at: item.updated_at,
          url: item.url,
          filename: item.filename,
          arrangement_data: null, // Will be populated later if needed
          is_published: item.type === 'published' // Determine published status from type
        }));
        
        setWorkArrangements(transformedData);
        
        // Set current arrangement if available
        if (transformedData.length > 0) {
          // Find arrangement for the selected date
          const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd');
          const matchingArrangement = transformedData.find(arr => arr.week_start === weekStart);
          setCurrentArrangement(matchingArrangement || transformedData[0]);
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Error fetching work arrangements: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousWeek = () => {
    const prevWeek = new Date(selectedDate);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setSelectedDate(prevWeek);
  };

  const handleNextWeek = () => {
    const nextWeek = new Date(selectedDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setSelectedDate(nextWeek);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const base64Data = event.target.result.toString().split(',')[1];
          const url = `data:${file.type};base64,${base64Data}`;
          setFileUrl(url);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadArrangement = async () => {
    if (!fileUrl || !fileName) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a file to upload"
      });
      return;
    }

    try {
      setUploadingFile(true);
      const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd');
      
      // Check if an arrangement already exists for this date and type
      const { data: existingData, error: existingError } = await supabase
        .from('work_arrangements')
        .select('*')
        .eq('week_start', weekStart)
        .eq('type', arrangementType);
      
      if (existingError) throw existingError;
      
      let operationPromise;
      
      if (existingData && existingData.length > 0) {
        // Update existing arrangement
        operationPromise = supabase
          .from('work_arrangements')
          .update({
            filename: fileName,
            url: fileUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData[0].id);
      } else {
        // Create new arrangement
        operationPromise = supabase
          .from('work_arrangements')
          .insert({
            id: uuidv4(),
            week_start: weekStart,
            filename: fileName,
            url: fileUrl,
            type: arrangementType
          });
      }
      
      const { error: operationError } = await operationPromise;
      if (operationError) throw operationError;
      
      toast({
        title: "Success",
        description: `Work arrangement ${existingData && existingData.length > 0 ? 'updated' : 'uploaded'} successfully`
      });
      
      // Refresh arrangements list
      fetchWorkArrangements();
      
      // Clear form
      setFileUrl('');
      setFileName('');
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Error uploading work arrangement: ${error.message}`
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const deleteArrangement = async (arrangementId: string) => {
    if (!confirm('Are you sure you want to delete this arrangement?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('work_arrangements')
        .delete()
        .eq('id', arrangementId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Work arrangement deleted successfully"
      });
      
      // Refresh arrangements list
      fetchWorkArrangements();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Error deleting work arrangement: ${error.message}`
      });
    }
  };

  const generateWeekDisplay = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const weekEnd = addDays(weekStart, 6);
    return `${format(weekStart, 'dd/MM/yyyy')} - ${format(weekEnd, 'dd/MM/yyyy')}`;
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Digital Work Arrangement</h1>
      
      {/* Date selection and controls */}
      <div className="flex items-center mb-4 space-x-2">
        <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <DatePicker 
          date={selectedDate} 
          onSelect={(date) => date && setSelectedDate(date)} 
        />
        
        <Button variant="outline" size="icon" onClick={handleNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="ml-4 text-sm text-gray-500">
          Week: {generateWeekDisplay()}
        </div>
      </div>
      
      {/* Upload section */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Upload Work Arrangement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="arrangement-type">Department</Label>
              <Select 
                value={arrangementType} 
                onValueChange={setArrangementType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="digital">Digital</SelectItem>
                  <SelectItem value="producers">Producers</SelectItem>
                  <SelectItem value="engineers">Engineers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="file-upload">Upload PDF File</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="file-upload" 
                  type="file" 
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="flex-1" 
                />
                <Button 
                  onClick={uploadArrangement} 
                  disabled={uploadingFile || !fileUrl}
                >
                  {uploadingFile ? "Uploading..." : "Upload"}
                  <FileUp className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Current Work Arrangements */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Current Work Arrangements</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading work arrangements...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['digital', 'producers', 'engineers'].map(type => {
                  const arrangement = workArrangements.find(
                    arr => arr.week_start === format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd') && 
                    (type === 'digital' ? arr.filename?.toLowerCase().includes('digital') : 
                     type === 'producers' ? arr.filename?.toLowerCase().includes('producer') : 
                     arr.filename?.toLowerCase().includes('engineer'))
                  );
                  
                  return (
                    <Card key={type} className="p-4">
                      <h3 className="font-semibold capitalize mb-2">{type}</h3>
                      {arrangement ? (
                        <div>
                          <p className="text-sm mb-2 truncate">{arrangement.filename}</p>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(arrangement.url, '_blank')}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => deleteArrangement(arrangement.id)}
                            >
                              <Trash className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No arrangement uploaded</p>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Digital Arrangement Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Public Schedule Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-md">
              <h3 className="font-semibold mb-2">Public Schedule URL</h3>
              <div className="flex items-center space-x-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/schedule/${format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd')}`} 
                />
                <Button 
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/schedule/${format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd')}`);
                    toast({
                      title: "Copied",
                      description: "URL copied to clipboard"
                    });
                  }}
                >
                  <Link className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2">Share this link to provide access to the public schedule</p>
            </div>
            
            <div className="p-4 border rounded-md">
              <h3 className="font-semibold mb-2">Preview Public View</h3>
              <Button 
                onClick={() => window.open(`/schedule/${format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd')}`, '_blank')}
              >
                <Eye className="h-4 w-4 mr-1" />
                Open Preview
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DigitalWorkArrangement;
