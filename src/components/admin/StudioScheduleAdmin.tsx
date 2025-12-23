import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Check, 
  X, 
  RefreshCw, 
  Clock, 
  Calendar,
  Users,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getPendingRequests,
  bulkUpdateBookings,
  getSyncLogs,
  importFromGoogleCalendar,
  clearGoogleCalendarBookings,
  deduplicateBookings,
  getApprovers,
  removeApprover
} from '@/lib/api/studio-schedule';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Booking {
  id: string;
  studio_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  title: string;
  notes?: string;
  user_name: string;
  user_email: string;
  created_at: string;
}

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  events_processed: number;
  events_created: number;
  events_updated: number;
  conflicts_detected: number;
  error_message?: string;
  sync_started_at: string;
  sync_completed_at: string;
}

interface Approver {
  id: string;
  user_id: string;
  name: string;
  email: string;
  is_active: boolean;
}

const StudioScheduleAdmin: React.FC = () => {
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [adminNotes, setAdminNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'deny'>('approve');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    fetchPendingRequests();
    fetchSyncLogs();
    fetchApprovers();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const data = await getPendingRequests();
      setPendingBookings(data);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      toast.error('שגיאה בטעינת בקשות ממתינות');
    }
  };

  const fetchSyncLogs = async () => {
    try {
      const data = await getSyncLogs();
      setSyncLogs(data.slice(0, 10)); // Show last 10 syncs
    } catch (error) {
      console.error('Error fetching sync logs:', error);
    }
  };

  const fetchApprovers = async () => {
    try {
      const data = await getApprovers();
      setApprovers(data);
    } catch (error) {
      console.error('Error fetching approvers:', error);
    }
  };

  const handleSelectBooking = (id: string) => {
    setSelectedBookings(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedBookings.length === pendingBookings.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(pendingBookings.map(b => b.id));
    }
  };

  const handleBulkAction = async (action: 'approve' | 'deny') => {
    if (selectedBookings.length === 0) {
      toast.error('נא לבחור לפחות בקשה אחת');
      return;
    }

    setActionType(action);
    setShowNotesDialog(true);
  };

  const confirmBulkAction = async () => {
    try {
      setIsLoading(true);
      await bulkUpdateBookings(
        selectedBookings,
        actionType === 'approve' ? 'approved' : 'denied',
        adminNotes
      );
      
      toast.success(
        actionType === 'approve' 
          ? `${selectedBookings.length} בקשות אושרו בהצלחה`
          : `${selectedBookings.length} בקשות נדחו`
      );
      
      setSelectedBookings([]);
      setAdminNotes('');
      setShowNotesDialog(false);
      fetchPendingRequests();
    } catch (error) {
      console.error('Error updating bookings:', error);
      toast.error('שגיאה בעדכון הבקשות');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      setSyncProgress(0);
      
      // Simulate progress while syncing
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 90) return prev; // Don't go to 100% until sync completes
          return prev + 5;
        });
      }, 500);
      
      const result = await importFromGoogleCalendar();
      
      clearInterval(progressInterval);
      setSyncProgress(100);
      
      console.log('Sync result:', result);
      
      // Handle async background processing
      if (result.status === 'processing') {
        toast.info('הסנכרון החל בעיבוד ברקע. בדוק את לוגי הסנכרון להתקדמות.');
        // Poll for completion
        let pollCount = 0;
        const pollInterval = setInterval(async () => {
          pollCount++;
          const updatedLogs = await getSyncLogs();
          setSyncLogs(updatedLogs.slice(0, 10));
          
          // Check if sync completed by looking at the latest log
          if (updatedLogs && updatedLogs.length > 0) {
            const latestLog = updatedLogs[0];
            if (latestLog.status === 'success' || latestLog.status === 'failed') {
              clearInterval(pollInterval);
              setSyncProgress(100);
              setTimeout(() => {
                setSyncProgress(0);
                setIsSyncing(false);
              }, 1000);
            }
          }
          
          // Stop polling after 2 minutes (60 polls * 2 seconds)
          if (pollCount >= 60) {
            clearInterval(pollInterval);
            setSyncProgress(0);
            setIsSyncing(false);
          }
        }, 2000);
      } else if (result.status === 'completed' || (result.eventsCreated !== undefined && result.eventsUpdated !== undefined)) {
        // Handle immediate completion (if sync is fast)
        const created = result.eventsCreated ?? 0;
        const updated = result.eventsUpdated ?? 0;
        toast.success(
          `סנכרון הושלם: ${created} נוצרו, ${updated} עודכנו`
        );
        await fetchSyncLogs();
        setTimeout(() => {
          setSyncProgress(0);
        }, 1000);
      } else {
        toast.info('הסנכרון החל. בדוק את לוגי הסנכרון להתקדמות.');
        await fetchSyncLogs();
        setTimeout(() => {
          setSyncProgress(0);
        }, 1000);
      }
    } catch (error) {
      console.error('Error syncing calendar:', error);
      toast.error('שגיאה בסנכרון יומן גוגל');
      setSyncProgress(0);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearBookings = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את כל ההזמנות מיומן גוגל? פעולה זו לא תשנה את יומן גוגל עצמו.')) {
      return;
    }

    try {
      setIsSyncing(true);
      const result = await clearGoogleCalendarBookings();
      toast.success(`נמחקו ${result.deleted_count} הזמנות מיומן גוגל`);
      fetchSyncLogs();
    } catch (error) {
      console.error('Error clearing bookings:', error);
      toast.error('שגיאה במחיקת הזמנות');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeduplicate = async () => {
    if (!confirm('האם אתה בטוח שברצונך להסיר כפילויות מההזמנות הקיימות?')) {
      return;
    }

    try {
      setIsSyncing(true);
      const result = await deduplicateBookings();
      toast.success(`הוסרו ${result.deleted_count} כפילויות מ-${result.duplicate_groups} קבוצות`);
      fetchSyncLogs();
    } catch (error) {
      console.error('Error deduplicating bookings:', error);
      toast.error('שגיאה בהסרת כפילויות');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRemoveApprover = async (approverId: string) => {
    if (!confirm('האם אתה בטוח שברצונך להסיר מאשר זה?')) {
      return;
    }

    try {
      await removeApprover(approverId);
      toast.success('מאשר הוסר בהצלחה');
      fetchApprovers();
    } catch (error) {
      console.error('Error removing approver:', error);
      toast.error('שגיאה בהסרת מאשר');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 ml-2" />
            בקשות ממתינות ({pendingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="sync">
            <RefreshCw className="h-4 w-4 ml-2" />
            סנכרון יומן גוגל
          </TabsTrigger>
          <TabsTrigger value="approvers">
            <Users className="h-4 w-4 ml-2" />
            מאשרים
          </TabsTrigger>
        </TabsList>

        {/* Pending Requests Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>בקשות הזמנת אולפן ממתינות</CardTitle>
              <CardDescription>
                נדרשת אישור מנהל לבקשות הבאות
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  אין בקשות ממתינות
                </div>
              ) : (
                <>
                  {/* Bulk Actions */}
                  <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedBookings.length === pendingBookings.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm font-medium">
                        {selectedBookings.length > 0
                          ? `${selectedBookings.length} נבחרו`
                          : 'בחר הכל'}
                      </span>
                    </div>
                    
                    {selectedBookings.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleBulkAction('approve')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 ml-2" />
                          אשר הכל
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleBulkAction('deny')}
                        >
                          <X className="h-4 w-4 ml-2" />
                          דחה הכל
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Booking List */}
                  <div className="space-y-3">
                    {pendingBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <Checkbox
                          checked={selectedBookings.includes(booking.id)}
                          onCheckedChange={() => handleSelectBooking(booking.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold">{booking.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {booking.studio_name} • {' '}
                                {format(new Date(booking.booking_date), 'dd/MM/yyyy', { locale: he })} • {' '}
                                {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                מבקש: {booking.user_name} ({booking.user_email})
                              </p>
                              {booking.notes && (
                                <p className="text-sm text-gray-600 mt-2">
                                  הערות: {booking.notes}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary">
                              {format(new Date(booking.created_at), 'dd/MM HH:mm', { locale: he })}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Calendar Sync Tab */}
        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>סנכרון יומן גוגל</CardTitle>
                  <CardDescription>
                    סנכרון אוטומטי כל 10 דקות. ניתן גם לבצע סנכרון ידני.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    סנכרון ידני
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Progress Bar */}
              {isSyncing && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">מתבצע סנכרון...</span>
                    <span className="text-sm text-gray-500">{syncProgress}%</span>
                  </div>
                  <Progress value={syncProgress} className="h-2.5" />
                </div>
              )}
              
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold mb-2 text-yellow-800">ניהול כפילויות</h4>
                <p className="text-sm text-yellow-700 mb-3">
                  אם יש כפילויות בלוח, ניתן לנקות אותן לפני סנכרון מחדש.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleDeduplicate}
                    disabled={isSyncing}
                    variant="outline"
                    size="sm"
                    className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
                  >
                    הסר כפילויות
                  </Button>
                  <Button
                    onClick={handleClearBookings}
                    disabled={isSyncing}
                    variant="outline"
                    size="sm"
                    className="border-red-600 text-red-700 hover:bg-red-100"
                  >
                    נקה כל ההזמנות מיומן גוגל
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {syncLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    אין היסטוריית סנכרון
                  </div>
                ) : (
                  syncLogs.map((log) => (
                    <div key={log.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              log.status === 'success' ? 'default' :
                              log.status === 'failed' ? 'destructive' : 'secondary'
                            }
                          >
                            {log.status === 'success' ? 'הצלחה' : 
                             log.status === 'failed' ? 'נכשל' : log.status}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {format(new Date(log.sync_started_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {log.events_processed} אירועים • {' '}
                          {log.events_created} נוצרו • {' '}
                          {log.events_updated} עודכנו
                          {log.conflicts_detected > 0 && (
                            <span className="text-orange-600">
                              {' '}• {log.conflicts_detected} התנגשויות
                            </span>
                          )}
                        </div>
                      </div>
                      {log.error_message && (
                        <p className="text-sm text-red-600 mt-2">
                          שגיאה: {log.error_message}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvers Tab */}
        <TabsContent value="approvers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ניהול מאשרים</CardTitle>
                  <CardDescription>
                    משתמשים שיקבלו התראות על בקשות הזמנה חדשות
                  </CardDescription>
                </div>
                {/* TODO: Add "Add Approver" button */}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {approvers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    אין מאשרים מוגדרים
                  </div>
                ) : (
                  approvers.map((approver) => (
                    <div
                      key={approver.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-semibold">{approver.name}</h4>
                        <p className="text-sm text-gray-600">{approver.email}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveApprover(approver.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Action Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'אישור בקשות' : 'דחיית בקשות'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? 'הוסף הערות לבקשות המאושרות (אופציונלי)'
                : 'הוסף סיבה לדחיית הבקשות'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="הערות מנהל..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNotesDialog(false)}
            >
              ביטול
            </Button>
            <Button
              onClick={confirmBulkAction}
              disabled={isLoading}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {isLoading ? 'מעדכן...' : actionType === 'approve' ? 'אשר' : 'דחה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudioScheduleAdmin;
