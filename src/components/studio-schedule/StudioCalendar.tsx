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

interface StudioCalendarProps {
  studioId: number;
  studioName: string;
  bookings: StudioBooking[];
  onEventClick: (eventInfo: any) => void;
  onDateSelect: (selectInfo: any) => void;
  isAdmin: boolean;
}

const StudioCalendar: React.FC<StudioCalendarProps> = ({
  studioId,
  studioName,
  bookings,
  onEventClick,
  onDateSelect,
  isAdmin
}) => {
  // Convert bookings to FullCalendar events
  const events = bookings
    .filter(booking => booking.studio_id === studioId)
    .map(booking => ({
      id: booking.id,
      title: booking.title,
      start: `${booking.booking_date}T${booking.start_time}`,
      end: `${booking.booking_date}T${booking.end_time}`,
      backgroundColor: getStatusColor(booking.status),
      borderColor: getStatusColor(booking.status),
      extendedProps: {
        status: booking.status,
        notes: booking.notes,
        studioName: booking.studio_name
      }
    }));

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
    <div className="studio-calendar">
      <h3 className="text-lg font-semibold mb-4 text-center">{studioName}</h3>
      <div className="calendar-container" style={{ height: '600px' }}>
        <FullCalendar
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridWeek,timeGridWeek'
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
        />
      </div>
    </div>
  );
};

export default StudioCalendar; 