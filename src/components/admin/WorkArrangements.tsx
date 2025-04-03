
import React, { useState, useEffect } from 'react';
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { CopyIcon, CheckIcon, UploadIcon, FileDigit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import DigitalWorkArrangement from './DigitalWorkArrangement';

type ArrangementType = 'producers' | 'engineers' | 'digital';

interface ArrangementFile {
  id: string;
  filename: string;
  url: string;
  created_at: string;
  type: ArrangementType;
  week_start: string;
}

interface Database {
  public: {
    Tables: {
      work_arrangements: {
        Row: ArrangementFile;
        Insert: Omit<ArrangementFile, 'id' | 'created_at'>;
        Update: Partial<Omit<ArrangementFile, 'id' | 'created_at'>>;
      };
    };
  };
}

const WorkArrangements = () => {
  const [producersFile, setProducersFile] = useState<File | null>(null);
  const [engineersFile, setEngineersFile] = useState<File | null>(null);
  const [digitalFile, setDigitalFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [arrangements, setArrangements] = useState<Record<ArrangementType, ArrangementFile | null>>({
    producers: null,
    engineers: null,
    digital: null
  });
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('producers');
  
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  // Load existing arrangements
  useEffect(() => {
    fetchArrangements();
  }, [currentWeek]);
  
  const fetchArrangements = async () => {
    const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('work_arrangements')
      .select('*')
      .eq('week_start', weekStartStr);
      
    if (error) {
      console.error('Error fetching arrangements:', error);
      return;
    }
    
    const arrangementsRecord: Record<ArrangementType, ArrangementFile | null> = {
      producers: null,
      engineers: null,
      digital: null
    };
    
    data?.forEach(item => {
      const arrangementItem = item as unknown as ArrangementFile;
      arrangementsRecord[arrangementItem.type as ArrangementType] = arrangementItem;
    });
    
    setArrangements(arrangementsRecord);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: ArrangementType) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      if (file.type !== 'application/pdf') {
        toast({
          title: "שגיאה",
          description: "יש להעלות קובץ PDF בלבד",
          variant: "destructive"
        });
        return;
      }
      
      switch (type) {
        case 'producers':
          setProducersFile(file);
          break;
        case 'engineers':
          setEngineersFile(file);
          break;
        case 'digital':
          setDigitalFile(file);
          break;
      }
    }
  };
  
  const uploadFile = async (file: File, type: ArrangementType) => {
    if (!file) return null;
    
    const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
    // Sanitize file name to prevent URL encoding issues
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const fileName = `${type}_${weekStartStr}_${sanitizedFileName}`;
    
    // Upload to Storage
    try {
      const { data, error } = await supabase.storage
        .from('arrangements')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (error) {
        console.error('Error uploading file:', error);
        throw error;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('arrangements')
        .getPublicUrl(fileName);
        
      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };
  
  const handleUpload = async (type: ArrangementType) => {
    if (!isAuthenticated) {
      toast({
        title: "שגיאה",
        description: "יש להתחבר למערכת כדי להעלות קבצים",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      let file = null;
      switch (type) {
        case 'producers':
          file = producersFile;
          break;
        case 'engineers':
          file = engineersFile;
          break;
        case 'digital':
          file = digitalFile;
          break;
      }
      
      if (!file) {
        toast({
          title: "שגיאה",
          description: "לא נבחר קובץ להעלאה",
          variant: "destructive"
        });
        return;
      }
      
      const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
      
      // Check if there's an existing record for this type and week
      try {
        const { data: existingData, error: queryError } = await supabase
          .from('work_arrangements')
          .select('id')
          .eq('type', type)
          .eq('week_start', weekStartStr)
          .maybeSingle();
          
        if (queryError) {
          console.error('Error querying existing record:', queryError);
          throw queryError;
        }
        
        const url = await uploadFile(file, type);
        
        if (existingData?.id) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('work_arrangements')
            .update({
              filename: file.name,
              url: url,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingData.id);
            
          if (updateError) {
            console.error('Error updating record:', updateError);
            throw updateError;
          }
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('work_arrangements')
            .insert({
              type: type,
              filename: file.name,
              url: url,
              week_start: weekStartStr
            });
            
          if (insertError) {
            console.error('Error inserting record:', insertError);
            throw insertError;
          }
        }
        
        toast({
          title: "הקובץ הועלה בהצלחה",
          description: `קובץ סידור עבודה ${getHebrewTypeName(type)} הועלה בהצלחה`,
        });
        
        // Reset file state
        switch (type) {
          case 'producers':
            setProducersFile(null);
            break;
          case 'engineers':
            setEngineersFile(null);
            break;
          case 'digital':
            setDigitalFile(null);
            break;
        }
        
        // Refresh arrangements
        fetchArrangements();
      } catch (error) {
        console.error('Database operation error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "שגיאה בהעלאת הקובץ",
        description: "אירעה שגיאה בעת העלאת הקובץ. אנא נסה שנית.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const getHebrewTypeName = (type: ArrangementType): string => {
    switch (type) {
      case 'producers': return 'מפיקים';
      case 'engineers': return 'טכנאים';
      case 'digital': return 'דיגיטל';
      default: return '';
    }
  };
  
  const getShareableLink = (offset: number = 0): string => {
    const targetDate = offset === 0 
      ? currentWeek 
      : offset > 0 
        ? addWeeks(currentWeek, offset) 
        : subWeeks(currentWeek, Math.abs(offset));
        
    const weekParam = format(targetDate, 'yyyy-MM-dd');
    const baseUrl = window.location.origin;
    return `${baseUrl}/schedule/${weekParam}`;
  };
  
  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link)
      .then(() => {
        setCopiedLink(link);
        setTimeout(() => setCopiedLink(null), 2000);
        
        toast({
          title: "הקישור הועתק",
          description: "הקישור הועתק ללוח העריכה",
        });
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        toast({
          title: "שגיאה בהעתקה",
          description: "לא ניתן להעתיק את הקישור",
          variant: "destructive"
        });
      });
  };
  
  const navigateWeek = (offset: number) => {
    if (offset > 0) {
      setCurrentWeek(prevWeek => addWeeks(prevWeek, offset));
    } else {
      setCurrentWeek(prevWeek => subWeeks(prevWeek, Math.abs(offset)));
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>סידורי עבודה</CardTitle>
          <CardDescription>העלאת קבצי סידורי עבודה שבועיים</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => navigateWeek(-1)}>שבוע קודם</Button>
            <span className="font-medium">
              שבוע {format(currentWeek, 'dd/MM/yyyy', { locale: he })} - {format(addWeeks(currentWeek, 1), 'dd/MM/yyyy', { locale: he })}
            </span>
            <Button variant="outline" onClick={() => navigateWeek(1)}>שבוע הבא</Button>
          </div>
          
          <Tabs defaultValue="producers" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="producers">מפיקים</TabsTrigger>
              <TabsTrigger value="engineers">טכנאים</TabsTrigger>
              <TabsTrigger value="digital-pdf">דיגיטל (PDF)</TabsTrigger>
              <TabsTrigger value="digital-editor" className="flex items-center gap-2">
                <FileDigit className="h-4 w-4" />
                עורך דיגיטל
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="producers" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="producers-file">העלאת סידור עבודה למפיקים</Label>
                <div className="flex gap-2">
                  <Input
                    id="producers-file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileChange(e, 'producers')}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => handleUpload('producers')}
                    disabled={!producersFile || isUploading}
                  >
                    {isUploading ? 'מעלה...' : 'העלאה'}
                    <UploadIcon className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                {arrangements.producers && (
                  <div className="text-sm mt-2">
                    <p>קובץ נוכחי: {arrangements.producers.filename}</p>
                    <a 
                      href={arrangements.producers.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:underline"
                    >
                      צפייה בקובץ
                    </a>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="engineers" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="engineers-file">העלאת סידור עבודה לטכנאים</Label>
                <div className="flex gap-2">
                  <Input
                    id="engineers-file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileChange(e, 'engineers')}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => handleUpload('engineers')}
                    disabled={!engineersFile || isUploading}
                  >
                    {isUploading ? 'מעלה...' : 'העלאה'}
                    <UploadIcon className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                {arrangements.engineers && (
                  <div className="text-sm mt-2">
                    <p>קובץ נוכחי: {arrangements.engineers.filename}</p>
                    <a 
                      href={arrangements.engineers.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:underline"
                    >
                      צפייה בקובץ
                    </a>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="digital-pdf" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="digital-file">העלאת סידור עבודה לדיגיטל</Label>
                <div className="flex gap-2">
                  <Input
                    id="digital-file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileChange(e, 'digital')}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => handleUpload('digital')}
                    disabled={!digitalFile || isUploading}
                  >
                    {isUploading ? 'מעלה...' : 'העלאה'}
                    <UploadIcon className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                {arrangements.digital && (
                  <div className="text-sm mt-2">
                    <p>קובץ נוכחי: {arrangements.digital.filename}</p>
                    <a 
                      href={arrangements.digital.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:underline"
                    >
                      צפייה בקובץ
                    </a>
                  </div>
                )}
                <div className="mt-4 p-3 border rounded bg-amber-50">
                  <p className="text-amber-700">
                    <strong>הערה:</strong> אנו ממליצים להשתמש בעורך סידור העבודה החדש בטאב "עורך דיגיטל" במקום העלאת קובץ PDF.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="digital-editor" className="space-y-4">
              <DigitalWorkArrangement />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>קישורים לשיתוף</CardTitle>
          <CardDescription>קישורים לצפייה פומבית בלוח השידורים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>שבוע שעבר</Label>
            <div className="flex gap-2">
              <Input value={getShareableLink(-1)} readOnly className="flex-1" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(getShareableLink(-1))}
              >
                {copiedLink === getShareableLink(-1) ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>שבוע נוכחי</Label>
            <div className="flex gap-2">
              <Input value={getShareableLink(0)} readOnly className="flex-1" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(getShareableLink(0))}
              >
                {copiedLink === getShareableLink(0) ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>שבוע הבא</Label>
            <div className="flex gap-2">
              <Input value={getShareableLink(1)} readOnly className="flex-1" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(getShareableLink(1))}
              >
                {copiedLink === getShareableLink(1) ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkArrangements;
