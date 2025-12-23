import React, { useState, useEffect } from 'react';
import { format, addWeeks, subWeeks, startOfWeek, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Calendar, RefreshCw } from 'lucide-react';
import WeeklyAssignments from './WeeklyAssignments';
import MonthlySummary from './MonthlySummary';
import { getOrCreateProducerWorkArrangement, updateProducerWorkArrangementNotes, getProducersByDivision } from '@/lib/supabase/producers';
import { Textarea } from '@/components/ui/textarea';
import { getDivisions } from '@/lib/supabase/divisions';
import { api } from '@/lib/api-client';

const ProducerWorkArrangement = () => {
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [activeTab, setActiveTab] = useState<string>("weekly");
  const [notes, setNotes] = useState<string>("");
  const [arrangementId, setArrangementId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [producers, setProducers] = useState<any[]>([]);
  
  const { toast } = useToast();
  
  // Ensure we have the producer division ID in localStorage
  useEffect(() => {
    const ensureProducerDivisionId = async () => {
      try {
        // Check if we already have the ID stored
        const cachedId = localStorage.getItem('producer-division-id');
        if (cachedId) {
          // Validate the cached ID to ensure it's a valid UUID
          const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cachedId);
          if (isValidUuid) {
            return;
          } else {
            localStorage.removeItem('producer-division-id');
          }
        }
        
        // If not, find the producer division and store its ID
        const divisions = await getDivisions();
        // Look for producer division with multiple possible names
        const producerDiv = divisions.find(div => 
          div.name.toLowerCase() === 'producers' || 
          div.name.toLowerCase() === 'מפיקים' ||
          div.name.toLowerCase() === 'עורכים ומפיקים' ||
          div.name.toLowerCase() === 'הפקה' ||
          div.name.toLowerCase() === 'מפיק' ||
          div.name.toLowerCase() === 'production staff'
        );
        
        if (producerDiv) {
          localStorage.setItem('producer-division-id', producerDiv.id);
        } else {
          // Here we won't create a default ID since that was causing the UUID validation error
        }
      } catch (error) {
        console.error("Error ensuring producer division ID:", error);
      }
    };
    
    ensureProducerDivisionId();
  }, []);
  
  useEffect(() => {
    loadWorkArrangement();
  }, [currentWeek]);
  
  const loadWorkArrangement = async () => {
    setIsLoading(true);
    try {
      const arrangement = await getOrCreateProducerWorkArrangement(currentWeek);
      if (arrangement) {
        setNotes(arrangement.notes || "");
        setArrangementId(arrangement.id);
      }
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
    setCurrentWeek(newWeek);
  };
  
  const handleForceRefresh = () => {
    // Clear caches related to producers/divisions
    localStorage.removeItem('producer-division-id');
    localStorage.removeItem('divisions-cache');
    localStorage.removeItem('producers-list');
    localStorage.removeItem('producer-roles');
    
    // Clear specific producers by division cache
    const producerDivisionId = localStorage.getItem('producer-division-id');
    if (producerDivisionId) {
      localStorage.removeItem(`producers-by-division-${producerDivisionId}`);
    }
    
    // Clear other related caches
    sessionStorage.removeItem('all-worker-divisions');
    
    // Force re-fetch from API
    setRefreshTrigger(prev => prev + 1);
    
    toast({
      title: "רענון נתונים",
      description: "הנתונים מתעדכנים מהשרת...",
    });
  };
  
  // This function is now simplified to not cause a full reload
  const triggerRefresh = () => {
  };
  
  const weekDisplay = `${format(currentWeek, 'dd/MM/yyyy', { locale: he })} - ${format(addDays(currentWeek, 6), 'dd/MM/yyyy', { locale: he })}`;

  useEffect(() => {
    const loadProducers = async () => {
      try {
        const workersList = await api.query('/workers', {
          where: { 
            or: [
              { 'department ILIKE': '%מפיקים%' },
              { 'department ILIKE': '%מפיק%' },
              { 'department ILIKE': '%הפקה%' },
              { 'department ILIKE': '%producers%' },
              { 'department ILIKE': '%Production staff%' }
            ]
          }
        });
        setProducers(workersList.data || []);
      } catch (error) {
        console.error('Error loading producers:', error);
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את רשימת המפיקים",
          variant: "destructive"
        });
      }
    };
    loadProducers();
  }, [toast]);

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
            <Button
              variant="outline"
              size="icon"
              onClick={handleForceRefresh}
              title="רענן נתונים"
            >
              <RefreshCw className="h-4 w-4" />
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="weekly">סידור שבועי</TabsTrigger>
              <TabsTrigger value="monthly">סיכום חודשי</TabsTrigger>
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
                    className="text-right"
                  />
                  <Button onClick={handleSaveNotes} disabled={isLoading}>
                    שמור הערות
                  </Button>
                </div>
                <WeeklyAssignments 
                  currentWeek={currentWeek} 
                  onAssignmentChange={triggerRefresh} 
                  refreshTrigger={refreshTrigger}
                  initialProducers={producers}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="monthly">
              <MonthlySummary />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProducerWorkArrangement;
