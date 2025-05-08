import React, { useState, useEffect } from 'react';
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import ProducersTable from './ProducersTable';
import WeeklyAssignments from './WeeklyAssignments';
import MonthlySummary from './MonthlySummary';
import ProducerUsers from './ProducerUsers';
import { getOrCreateProducerWorkArrangement, updateProducerWorkArrangementNotes } from '@/lib/supabase/producers';
import { Textarea } from '@/components/ui/textarea';

const ProducerWorkArrangement = () => {
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [activeTab, setActiveTab] = useState<string>("weekly");
  const [notes, setNotes] = useState<string>("");
  const [arrangementId, setArrangementId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  const { toast } = useToast();
  
  useEffect(() => {
    // Use a consistent date format for debugging
    const isoDate = currentWeek.toISOString();
    console.log("ProducerWorkArrangement component mounted or week changed, date:", isoDate);
    loadWorkArrangement();
  }, [currentWeek]);
  
  const loadWorkArrangement = async () => {
    setIsLoading(true);
    try {
      console.log("Loading producer work arrangement...");
      const arrangement = await getOrCreateProducerWorkArrangement(currentWeek);
      if (arrangement) {
        setNotes(arrangement.notes || "");
        setArrangementId(arrangement.id);
      }
      
      // After loading the work arrangement, also trigger a refresh of the assignments
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error loading work arrangement:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את סידור העבודה",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveNotes = async () => {
    if (!arrangementId) return;
    
    try {
      await updateProducerWorkArrangementNotes(arrangementId, notes);
      toast({
        title: "נשמר בהצלחה",
        description: "הערות סידור העבודה נשמרו בהצלחה",
      });
    } catch (error) {
      console.error("Error saving notes:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את ההערות",
        variant: "destructive",
      });
    }
  };
  
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'prev' ? subWeeks(currentWeek, 1) : addWeeks(currentWeek, 1);
    // Log using ISO format for consistency
    console.log(`Navigating to ${direction} week:`, newWeek.toISOString());
    setCurrentWeek(newWeek);
    // Trigger refresh when navigating to make sure assignments are properly loaded
    setRefreshTrigger(prev => prev + 1);
  };
  
  const triggerRefresh = () => {
    console.log("Triggering refresh of assignments");
    setRefreshTrigger(prev => prev + 1);
  };
  
  const weekDisplay = `${format(currentWeek, 'dd/MM/yyyy', { locale: he })} - ${format(addWeeks(currentWeek, 1), 'dd/MM/yyyy', { locale: he })}`;

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>סידור עבודה - הפקה ועריכה</CardTitle>
          <div className="flex items-center space-x-2 space-x-reverse">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigateWeek('prev')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="px-2 py-1 border rounded flex items-center min-w-[200px] justify-center">
              <Calendar className="ml-2 h-4 w-4" />
              <span>{weekDisplay}</span>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigateWeek('next')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="weekly"
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="weekly">סידור שבועי</TabsTrigger>
              <TabsTrigger value="producers">עובדי הפקה</TabsTrigger>
              <TabsTrigger value="monthly">סיכום חודשי</TabsTrigger>
              <TabsTrigger value="users">משתמשי מערכת</TabsTrigger>
            </TabsList>
            
            <TabsContent value="weekly">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">הערות לסידור</h3>
                  <Textarea
                    placeholder="הערות כלליות לסידור העבודה"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleSaveNotes} disabled={isLoading}>
                    שמור הערות
                  </Button>
                </div>
                <WeeklyAssignments 
                  currentWeek={currentWeek} 
                  onAssignmentChange={triggerRefresh} 
                  refreshTrigger={refreshTrigger}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="producers">
              <ProducersTable />
            </TabsContent>
            
            <TabsContent value="monthly">
              <MonthlySummary />
            </TabsContent>
            
            <TabsContent value="users">
              <ProducerUsers />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProducerWorkArrangement;
