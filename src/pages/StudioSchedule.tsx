import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { he } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getStudios, getBookings, createBooking, updateBookingStatus, createAdminBooking, deleteBooking } from '@/lib/api/studio-schedule';
import UnifiedStudioCalendar from '@/components/studio-schedule/UnifiedStudioCalendar';
import BookingForm from '@/components/studio-schedule/BookingForm';
import AdminBookingForm from '@/components/studio-schedule/AdminBookingForm';
import BookingDetails from '@/components/studio-schedule/BookingDetails';

interface Studio {
  id: number;
  name: string;
}

interface StudioBooking {
  id: string;
  studio_id: number;
  studio_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  title: string;
  notes?: string;
  status: 'pending' | 'approved' | 'denied';
  user_id: string;
  user_name?: string;
  user_email?: string;
  assigned_engineer?: string;
  created_at: string;
}

const StudioSchedule = () => {
  const { isAdmin } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [studios, setStudios] = useState<Studio[]>([]);
  const [bookings, setBookings] = useState<StudioBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<StudioBooking | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [selectedStudioId, setSelectedStudioId] = useState<number | undefined>();

  useEffect(() => {
    fetchData();
  }, [currentWeek]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch a wider date range to show past and future weeks
      const startDate = format(subWeeks(currentWeek, 4), 'yyyy-MM-dd');
      const endDate = format(addWeeks(currentWeek, 4), 'yyyy-MM-dd');

      const [studiosData, bookingsData] = await Promise.all([
        getStudios(),
        getBookings(startDate, endDate)
      ]);

      setStudios(studiosData);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitBooking = async (data: any) => {
    try {
      // Handle "ANY" studio selection
      if (data.studio_id === 'ANY') {
        data.studio_id = null;
      } else {
        data.studio_id = parseInt(data.studio_id);
      }

      await createBooking(data);
      toast.success('הבקשה נשלחה בהצלחה');
      setShowBookingForm(false);
      fetchData();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('שגיאה בשליחת הבקשה');
    }
  };

  const handleSubmitAdminBooking = async (data: any) => {
    try {
      data.studio_id = parseInt(data.studio_id);
      await createAdminBooking(data);
      toast.success('הזמנה נוצרה בהצלחה');
      setShowAdminForm(false);
      fetchData();
    } catch (error) {
      console.error('Error creating admin booking:', error);
      toast.error('שגיאה ביצירת ההזמנה');
    }
  };

  const handleEventClick = (eventInfo: any) => {
    const booking = bookings.find(b => b.id === eventInfo.event.id);
    if (booking) {
      setSelectedBooking(booking);
    }
  };

  const handleDateSelect = (selectInfo: any) => {
    if (!isAdmin) return;

    setSelectedDate(format(selectInfo.start, 'yyyy-MM-dd'));
    setSelectedStartTime(format(selectInfo.start, 'HH:mm'));
    setSelectedEndTime(format(selectInfo.end, 'HH:mm'));

    // Try to determine studio from the selection
    const studioId = selectInfo.resource?.id || selectedStudioId;
    setSelectedStudioId(studioId);

    setShowAdminForm(true);
  };

  const handleApprove = async (id: string) => {
    try {
      await updateBookingStatus(id, 'approved');
      toast.success('ההזמנה אושרה');
      setSelectedBooking(null);
      fetchData();
    } catch (error) {
      console.error('Error approving booking:', error);
      toast.error('שגיאה באישור ההזמנה');
    }
  };

  const handleDeny = async (id: string) => {
    try {
      await updateBookingStatus(id, 'denied');
      toast.success('ההזמנה נדחתה');
      setSelectedBooking(null);
      fetchData();
    } catch (error) {
      console.error('Error denying booking:', error);
      toast.error('שגיאה בדחיית ההזמנה');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק הזמנה זו?')) {
      return;
    }

    try {
      await deleteBooking(id);
      toast.success('ההזמנה נמחקה');
      setSelectedBooking(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('שגיאה במחיקת ההזמנה');
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(direction === 'prev' ? subWeeks(currentWeek, 1) : addWeeks(currentWeek, 1));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 animate-in">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="text-lg font-bold text-slate-400">טוען נתונים...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-800">לוח אולפנים</h1>
          <div className="flex items-center gap-3 text-slate-500 font-medium">
            <Calendar className="h-4 w-4" />
            <span>{format(currentWeek, 'dd/MM/yyyy', { locale: he })} - {format(endOfWeek(currentWeek), 'dd/MM/yyyy', { locale: he })}</span>
            <span className="text-slate-300 mx-1">|</span>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">מסונכרן Google Calendar</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white/50 p-1 rounded-xl border border-slate-200 premium-shadow">
            <Button onClick={() => navigateWeek('prev')} variant="ghost" size="sm" className="rounded-lg">
              שבוע קודם
            </Button>
            <Button onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 0 }))} variant="secondary" size="sm" className="rounded-lg shadow-sm">
              היום
            </Button>
            <Button onClick={() => navigateWeek('next')} variant="ghost" size="sm" className="rounded-lg">
              שבוע הבא
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Regular booking form */}
            <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 rounded-xl h-11 px-6 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
                  <Plus className="h-4 w-4" />
                  בקשת הזמנה
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl rounded-3xl overflow-hidden border-none p-0">
                <div className="p-8">
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-bold">בקשת הזמנת אולפן</DialogTitle>
                  </DialogHeader>
                  <BookingForm
                    studios={studios}
                    onSubmit={handleSubmitBooking}
                    onCancel={() => setShowBookingForm(false)}
                    initialDate={selectedDate}
                    initialStartTime={selectedStartTime}
                    initialEndTime={selectedEndTime}
                  />
                </div>
              </DialogContent>
            </Dialog>

            {/* Admin booking form */}
            {isAdmin && (
              <Dialog open={showAdminForm} onOpenChange={setShowAdminForm}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2 rounded-xl h-11 px-6 bg-slate-800 hover:bg-slate-900 shadow-lg shadow-slate-200 hover:scale-[1.02] transition-all">
                    <Plus className="h-4 w-4" />
                    הזמנה ישירה
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl rounded-3xl overflow-hidden border-none p-0">
                  <div className="p-8">
                    <DialogHeader className="mb-6">
                      <DialogTitle className="text-2xl font-bold">הזמנה ישירה (מנהל)</DialogTitle>
                    </DialogHeader>
                    <AdminBookingForm
                      studios={studios}
                      onSubmit={handleSubmitAdminBooking}
                      onCancel={() => setShowAdminForm(false)}
                      initialDate={selectedDate}
                      initialStartTime={selectedStartTime}
                      initialEndTime={selectedEndTime}
                      initialStudioId={selectedStudioId}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {/* Unified Calendar */}
      <div className="glass-card rounded-3xl p-6 md:p-8 border-none premium-shadow overflow-hidden">
        <UnifiedStudioCalendar
          studios={studios}
          bookings={bookings}
          onEventClick={handleEventClick}
          onDateSelect={handleDateSelect}
          isAdmin={isAdmin}
        />
      </div>

      {/* Booking Details Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="rounded-3xl border-none p-8 max-w-lg">
          {selectedBooking && (
            <BookingDetails
              booking={selectedBooking}
              isAdmin={isAdmin}
              onApprove={handleApprove}
              onDeny={handleDeny}
              onDelete={handleDelete}
              onClose={() => setSelectedBooking(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudioSchedule; 