import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { format, addWeeks } from 'date-fns';

interface Studio {
  id: number;
  name: string;
}

interface AdminBookingFormProps {
  studios: Studio[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  initialStudioId?: number;
}

const AdminBookingForm: React.FC<AdminBookingFormProps> = ({
  studios,
  onSubmit,
  onCancel,
  initialDate,
  initialStartTime,
  initialEndTime,
  initialStudioId
}) => {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      studio_id: initialStudioId?.toString() || '',
      booking_date: initialDate || format(new Date(), 'yyyy-MM-dd'),
      start_time: initialStartTime || '09:00',
      end_time: initialEndTime || '10:00',
      notes: '',
      is_recurring: false,
      recurrence_rule: 'weekly',
      recurrence_end_date: format(addWeeks(new Date(), 4), 'yyyy-MM-dd')
    }
  });

  const isRecurring = watch('is_recurring');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <h4 className="font-semibold text-blue-800 mb-2">הזמנה ישירה (מנהל)</h4>
        <p className="text-blue-700 text-sm">הזמנה זו תתבצע ישירות ללא צורך באישור</p>
      </div>

      <div>
        <Label htmlFor="title">מטרת האולפן *</Label>
        <Input
          id="title"
          {...register('title', { required: 'שדה חובה' })}
          placeholder="לדוגמה: הקלטת פודקאסט"
        />
        {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="studio">בחירת אולפן *</Label>
        <Select onValueChange={(value) => setValue('studio_id', value)}>
          <SelectTrigger>
            <SelectValue placeholder="בחר אולפן" />
          </SelectTrigger>
          <SelectContent>
            {studios.map(studio => (
              <SelectItem key={studio.id} value={studio.id.toString()}>
                {studio.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.studio_id && <p className="text-red-500 text-sm">{errors.studio_id.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="booking_date">תאריך *</Label>
          <Input
            id="booking_date"
            type="date"
            {...register('booking_date', { required: 'שדה חובה' })}
          />
          {errors.booking_date && <p className="text-red-500 text-sm">{errors.booking_date.message}</p>}
        </div>

        <div>
          <Label htmlFor="start_time">שעת התחלה *</Label>
          <Input
            id="start_time"
            type="time"
            {...register('start_time', { required: 'שדה חובה' })}
          />
          {errors.start_time && <p className="text-red-500 text-sm">{errors.start_time.message}</p>}
        </div>

        <div>
          <Label htmlFor="end_time">שעת סיום *</Label>
          <Input
            id="end_time"
            type="time"
            {...register('end_time', { required: 'שדה חובה' })}
          />
          {errors.end_time && <p className="text-red-500 text-sm">{errors.end_time.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">הערות</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="פרטים נוספים על ההזמנה..."
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_recurring"
          checked={isRecurring}
          onCheckedChange={(checked) => setValue('is_recurring', checked)}
        />
        <Label htmlFor="is_recurring">הזמנה חוזרת שבועית</Label>
      </div>

      {isRecurring && (
        <div>
          <Label htmlFor="recurrence_end_date">תאריך סיום חזרות</Label>
          <Input
            id="recurrence_end_date"
            type="date"
            {...register('recurrence_end_date')}
          />
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          ביטול
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          צור הזמנה
        </Button>
      </div>
    </form>
  );
};

export default AdminBookingForm; 