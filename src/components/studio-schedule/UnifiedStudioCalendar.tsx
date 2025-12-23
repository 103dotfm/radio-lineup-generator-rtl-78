import React from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

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
}

interface Studio {
  id: number;
  name: string;
}

interface UnifiedStudioCalendarProps {
  studios: Studio[];
  bookings: StudioBooking[];
  onEventClick: (eventInfo: any) => void;
  onDateSelect: (selectInfo: any) => void;
  isAdmin: boolean;
}

const UnifiedStudioCalendar: React.FC<UnifiedStudioCalendarProps> = ({
  studios,
  bookings,
  onEventClick,
  onDateSelect,
  isAdmin
}) => {
  // Studio colors for different layers
  const studioColors = [
    '#3b82f6', // blue - אולפן ב'
    '#10b981', // green - אולפן ג'
    '#f59e0b', // yellow - אולפן א'
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#f97316', // orange
    '#84cc16', // lime
  ];

  // Convert bookings to FullCalendar events with studio-specific styling
  const events = bookings.map(booking => {
    // Handle neutral events (no studio assigned)
    const isNeutral = !booking.studio_id || !booking.studio_name;
    const studioIndex = isNeutral ? -1 : studios.findIndex(s => s.id === booking.studio_id);
    const baseColor = isNeutral ? '#6b7280' : studioColors[studioIndex % studioColors.length]; // Gray for neutral
    const statusColor = getStatusColor(booking.status);
    
    // Convert UTC date to local date string for FullCalendar
    const bookingDate = new Date(booking.booking_date);
    const localDateString = format(bookingDate, 'yyyy-MM-dd');
    
    // Handle all-day events (00:00:00 times)
    const isAllDay = booking.start_time === '00:00:00' && booking.end_time === '00:00:00';
    
    // Create title - don't add studio name for neutral events
    const eventTitle = isNeutral ? booking.title : `${booking.studio_name}: ${booking.title}`;
    
    const event = {
      id: booking.id,
      title: eventTitle,
      start: isAllDay ? localDateString : `${localDateString}T${booking.start_time}`,
      end: isAllDay ? localDateString : `${localDateString}T${booking.end_time}`,
      allDay: isAllDay,
      backgroundColor: statusColor,
      borderColor: baseColor,
      borderWidth: 3,
      textColor: '#ffffff',
      extendedProps: {
        status: booking.status,
        notes: booking.notes,
        studioName: booking.studio_name,
        studioId: booking.studio_id,
        isNeutral: isNeutral
      }
    };
    
    return event;
  });

  function getStatusColor(status: string) {
    switch (status) {
      case 'approved':
        return '#10b981'; // green
      case 'pending':
        return '#f59e0b'; // yellow
      case 'denied':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  }

  return (
    <div className="unified-studio-calendar">
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-2">לוח אולפנים מאוחד</h3>
        <div className="flex flex-wrap gap-2">
          {studios.map((studio, index) => (
            <div key={studio.id} className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: studioColors[index % studioColors.length] }}
              />
              <span className="text-sm">{studio.name}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 mt-2">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span className="text-sm">אושר</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-yellow-500" />
            <span className="text-sm">ממתין</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-sm">נדחה</span>
          </div>
        </div>
      </div>
      
      <div className="calendar-container" style={{ height: '700px' }}>
        <FullCalendar
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          locale="he"
          direction="rtl"
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
          slotDuration="00:30:00"
          events={events}
          eventClick={onEventClick}
          selectable={isAdmin}
          select={onDateSelect}
          height="100%"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
            hour12: false
          }}
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
            hour12: false
          }}
          dayHeaderFormat={{
            weekday: 'short',
            day: 'numeric',
            month: 'short'
          }}
          eventDisplay="block"
          eventOverlap={false}
          slotEventOverlap={false}
          allDaySlot={true}
          allDayText="כל היום"
          nowIndicator={true}
          scrollTime="08:00:00"
        />
      </div>
    </div>
  );
};

export default UnifiedStudioCalendar; 