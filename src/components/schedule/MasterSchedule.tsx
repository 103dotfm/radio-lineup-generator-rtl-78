import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ScheduleView } from './ScheduleView';
import { Button } from "@/components/ui/button";
import { Plus, Database, RefreshCw, Wrench } from "lucide-react";
import ScheduleSlotDialog from './dialogs/ScheduleSlotDialog';
import { useQueryClient } from '@tanstack/react-query';
import { createScheduleSlot, updateScheduleSlot, getScheduleSlots } from '@/lib/api/schedule';
import { useToast } from '@/hooks/use-toast';
import { ScheduleSlot } from '@/types/schedule';
import { startOfWeek } from 'date-fns';
import { useScheduleSlots } from '@/components/schedule/hooks/useScheduleSlots';
import { ScheduleSlotForm } from './forms/ScheduleSlotForm';

// Set to true to show debug buttons
const SHOW_DEBUG_BUTTONS = false;

const MasterSchedule = () => {
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const scheduleContainerRef = useRef<HTMLDivElement>(null);
  
  const [refreshKey, setRefreshKey] = useState(0);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [dbDebugInfo, setDbDebugInfo] = useState<any>(null);
  const [fixResults, setFixResults] = useState<any>(null);
  const selectedDate = useMemo(() => new Date(), []);
  const { slots: fetchedSlots, refreshSlots } = useScheduleSlots(selectedDate, true);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Update slots when fetchedSlots changes
  useEffect(() => {

    setSlots(fetchedSlots);
  }, [fetchedSlots]);

  // Force refresh the slots periodically to ensure we have the latest data
  useEffect(() => {
    const fetchAndUpdateSlots = async () => {
      try {
    
        const updatedSlots = await getScheduleSlots({ isMasterSchedule: true });
        if (updatedSlots.length > 0) {
          setSlots(updatedSlots);
        }
      } catch (error) {
        console.error('Error directly fetching master slots:', error);
      }
    };

    // Initial fetch
    fetchAndUpdateSlots();
    
    // Set up interval to periodically refresh slots
    const intervalId = setInterval(() => {
      fetchAndUpdateSlots();
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  const refreshMasterSlots = useCallback(async () => {
    try {
      setIsLoading(true);
      
      await refreshSlots();
      
      // Also fetch directly as a backup
      const updatedSlots = await getScheduleSlots({ isMasterSchedule: true });
      setSlots(updatedSlots);
      setRefreshKey(prev => prev + 1);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error refreshing master slots:', error);
      setIsLoading(false);
    }
  }, [refreshSlots]);

  const checkDatabase = async () => {
    try {
      setIsLoading(true);
      
      // This API endpoint will be created next
      const response = await fetch('/api/debug/schedule-slots');
      const data = await response.json();

      setDbDebugInfo(data);
      toast({
        title: "Database Check Complete",
        description: `Found ${data.totalCount} slots, ${data.masterCount} master slots`,
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking database:', error);
      toast({
        title: "Database Check Failed",
        description: "Could not retrieve database information",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const fixSlots = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/debug/fix-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();

      setFixResults(data);
      
      // Refresh slots after fixing
      await refreshMasterSlots();
      
      toast({
        title: "Slots Fixed",
        description: `Fixed ${data.fixedDeletedMasterSlots.length} master slots and ${data.fixedIsMasterFlags.length} is_master flags`,
      });
      
      // Also refresh the debug info
      await checkDatabase();
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fixing slots:', error);
      toast({
        title: "Fix Failed",
        description: "Could not fix slots in the database",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const onSave = async (slotData: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>, isEditing: boolean, slotId?: string) => {
    try {
      setIsLoading(true);
      
      console.log('Attempting to save master schedule slot:', slotData);
      let savedSlot;
      if (isEditing && slotId) {
        console.log('Updating existing master slot');
        savedSlot = await updateScheduleSlot(slotId, slotData, true);
      } else {
        console.log('Creating new master slot');
        savedSlot = await createScheduleSlot(slotData, true);
      }
      console.log('Master schedule slot saved successfully');
      // Fetch updated slots and set state directly
      await refreshMasterSlots();
      
      setIsLoading(false);
      return savedSlot;
    } catch (error) {
      console.error('Error saving master schedule slot:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const handleUpdateMasterSlot = async (slotId: string, updates: Partial<ScheduleSlot>) => {
    try {
      setIsLoading(true);
      
      console.log('Updating master slot:', { slotId, updates });
      await updateScheduleSlot(slotId, {
        ...updates,
        start_time: updates.start_time || '00:00:00',
        end_time: updates.end_time || '00:00:00',
        show_name: updates.show_name || 'Example Show',
        is_recurring: updates.is_recurring || false
      }, true);
      console.log('Slot updated successfully');
      await refreshMasterSlots();
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to update slot:', error);
      toast({
        title: "Error",
        description: "Failed to update slot. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleSaveSlot = async (slotData: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>, id?: string) => {
    try {
      setIsLoading(true);
      
      console.log('Attempting to save master schedule slot:', slotData);
      let savedSlot;
      if (id) {
        console.log('Updating existing master slot');
        savedSlot = await updateScheduleSlot(id, slotData, true);
      } else {
        console.log('Creating new master slot');
        savedSlot = await createScheduleSlot(slotData, true);
      }
      console.log('Master schedule slot saved successfully');
      
      // Force refresh using multiple methods to ensure UI updates
      await queryClient.invalidateQueries({
        queryKey: ['scheduleSlots', 'masterSchedule', true]
      });
      console.log('Master schedule query cache invalidated');
      
      // Manually fetch updated slots
      const updatedSlots = await getScheduleSlots({ isMasterSchedule: true });
  
      setSlots(updatedSlots);
      
      // Force component refresh
      setRefreshKey(prev => prev + 1);
      
      setShowSlotDialog(false);
      setEditingSlot(null);
      
      setIsLoading(false);
      return savedSlot;
    } catch (error) {
      console.error('Error saving master schedule slot:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const handleEditSlot = (slot: ScheduleSlot) => {
    setEditingSlot(slot);
    setShowSlotDialog(true);
  };

  const handleCloseForm = () => {
    setEditingSlot(null);
    setShowSlotDialog(false);
  };

  const refetchSlots = async () => {
    setIsLoading(true);
    
    await queryClient.invalidateQueries({
      queryKey: ['scheduleSlots', 'masterSchedule', true]
    });
    console.log('Master schedule query cache invalidated');
    await refreshMasterSlots();
    
    setIsLoading(false);
  };

  // Force refresh of ScheduleView when slots change or refresh key changes
  useEffect(() => {

  }, [slots, refreshKey]);

  return (
    <div className="space-y-4" ref={containerRef}>
      <div className="p-4 rounded-lg bg-transparent">
        <h2 className="text-lg font-bold mb-2 text-right">לוח שידורים ראשי</h2>
        <p className="text-right">.זהו לוח השידורים הקבוע של התחנה. שינויים שנעשים כאן ישפיעו על כל השבועות העתידיים</p>
      </div>

      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button onClick={refreshMasterSlots} variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> רענן לוח
          </Button>
          {SHOW_DEBUG_BUTTONS && (
            <>
              <Button onClick={checkDatabase} variant="outline" disabled={isLoading}>
                <Database className="h-4 w-4 mr-2" /> בדוק נתונים
              </Button>
              <Button onClick={fixSlots} variant="outline" disabled={isLoading}>
                <Wrench className="h-4 w-4 mr-2" /> תקן משבצות
              </Button>
            </>
          )}
        </div>
        <Button onClick={() => setShowSlotDialog(true)} className="flex items-center gap-2" disabled={isLoading}>
          <Plus className="h-4 w-4" />
          הוסף משבצת שידור
        </Button>
      </div>

      {SHOW_DEBUG_BUTTONS && dbDebugInfo && (
        <div className="p-4 bg-gray-100 rounded-lg">
          <h3 className="font-bold mb-2">Database Info:</h3>
          <ul className="list-disc pl-5">
            <li>Total slots: {dbDebugInfo.totalCount}</li>
            <li>Master slots: {dbDebugInfo.masterCount}</li>
            <li>Active master slots: {dbDebugInfo.activeMasterCount}</li>
            <li>Weekly slots: {dbDebugInfo.weeklyCount}</li>
            <li>Deleted slots: {dbDebugInfo.deletedCount}</li>
          </ul>
          <div className="mt-2">
            <h4 className="font-semibold">Sample Master Slots:</h4>
            <pre className="bg-black text-white p-2 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(dbDebugInfo.sampleMasterSlots, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {SHOW_DEBUG_BUTTONS && fixResults && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="font-bold mb-2 text-green-800">Fix Results:</h3>
          <ul className="list-disc pl-5 text-green-700">
            <li>Fixed deleted master slots: {fixResults.fixedDeletedMasterSlots.length}</li>
            <li>Fixed is_master flags: {fixResults.fixedIsMasterFlags.length}</li>
            <li>Master slots after fix: {fixResults.postFixMasterCount}</li>
          </ul>
          {(fixResults.fixedDeletedMasterSlots.length > 0 || fixResults.fixedIsMasterFlags.length > 0) && (
            <div className="mt-2">
              <h4 className="font-semibold">Details:</h4>
              <pre className="bg-black text-white p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify({
                  fixedDeletedMasterSlots: fixResults.fixedDeletedMasterSlots,
                  fixedIsMasterFlags: fixResults.fixedIsMasterFlags
                }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Fixed height container for the schedule view */}
      <div 
        ref={scheduleContainerRef}
        className="border rounded-lg"
        style={{ minHeight: '1262px' }}
      >
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-50">
              <div className="flex flex-col items-center">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-700 mb-2" />
                <span className="text-gray-700 font-medium">טוען נתונים...</span>
              </div>
            </div>
          )}
          <ScheduleView 
            key={`schedule-view-${refreshKey}`}
            selectedDate={selectedDate} 
            isAdmin 
            isMasterSchedule 
            hideDateControls 
            showAddButton={false} 
            hideHeaderDates 
            containerHeight="100%"
          />
        </div>
      </div>

      <ScheduleSlotDialog
        isOpen={showSlotDialog}
        onClose={handleCloseForm}
        onSave={(data) => handleSaveSlot(data, editingSlot?.id)}
        editingSlot={editingSlot}
        isMasterSchedule={true}
        refetchSlots={refetchSlots}
      />
    </div>
  );
};

export default MasterSchedule;
