import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
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
  user_name?: string;
  user_email?: string;
  assigned_engineer?: string;
  created_at: string;
}

interface BookingDetailsProps {
  booking: StudioBooking;
  isAdmin: boolean;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const BookingDetails: React.FC<BookingDetailsProps> = ({
  booking,
  isAdmin,
  onApprove,
  onDeny,
  onDelete,
  onClose
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'denied':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'אושר';
      case 'pending':
        return 'ממתין לאישור';
      case 'denied':
        return 'נדחה';
      default:
        return 'לא ידוע';
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold">{booking.title}</h3>
        <Badge className={getStatusColor(booking.status)}>
          {getStatusText(booking.status)}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="font-medium">אולפן:</span>
          <span>{booking.studio_name}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium">תאריך:</span>
          <span>{format(new Date(booking.booking_date), 'dd/MM/yyyy', { locale: he })}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium">שעות:</span>
          <span>{booking.start_time} - {booking.end_time}</span>
        </div>
        
        {booking.user_name && (
          <div className="flex justify-between">
            <span className="font-medium">מבקש:</span>
            <span>{booking.user_name}</span>
          </div>
        )}
        
        {booking.assigned_engineer && (
          <div className="flex justify-between">
            <span className="font-medium">טכנאי משובץ:</span>
            <span className="text-blue-600 font-semibold">{booking.assigned_engineer}</span>
          </div>
        )}
        
        {booking.notes && (
          <div>
            <span className="font-medium">הערות:</span>
            <p className="mt-1 text-gray-600">{booking.notes}</p>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="font-medium">נוצר ב:</span>
          <span>{format(new Date(booking.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}</span>
        </div>
      </div>

      {isAdmin && (
        <div className="space-y-2 pt-4 border-t">
          {booking.status === 'pending' && (
            <div className="flex space-x-2">
              <Button 
                onClick={() => onApprove(booking.id)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                אשר
              </Button>
              <Button 
                onClick={() => onDeny(booking.id)}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                דחה
              </Button>
            </div>
          )}
          
          <Button 
            onClick={() => onDelete(booking.id)}
            className="w-full bg-red-600 hover:bg-red-700"
            variant="destructive"
          >
            מחק הזמנה
          </Button>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button variant="outline" onClick={onClose}>
          סגור
        </Button>
      </div>
    </div>
  );
};

export default BookingDetails; 