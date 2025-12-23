import { apiClient } from '../api-client';

// Studio Schedule V2 API - Clean, efficient implementation

// Basic Studio & Booking APIs
export const getStudios = async () => {
  const response = await apiClient.get('/studio-schedule-v2/studios');
  return response.data;
};

export const getBookings = async (startDate: string, endDate: string) => {
  const response = await apiClient.get('/studio-schedule-v2/bookings', {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data;
};

export const getBooking = async (id: string) => {
  const response = await apiClient.get(`/studio-schedule-v2/bookings/${id}`);
  return response.data;
};

export const createBooking = async (bookingData: {
  studio_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  title: string;
  notes?: string;
}) => {
  const response = await apiClient.post('/studio-schedule-v2/bookings', bookingData);
  return response.data;
};

export const updateBookingStatus = async (id: string, status: 'pending' | 'approved' | 'denied', adminNotes?: string) => {
  const response = await apiClient.patch(`/studio-schedule-v2/bookings/${id}`, { 
    status,
    admin_notes: adminNotes 
  });
  return response.data;
};

export const deleteBooking = async (id: string) => {
  const response = await apiClient.delete(`/studio-schedule-v2/bookings/${id}`);
  return response.data;
};

// Google Calendar sync
export const syncGoogleCalendar = async () => {
  const response = await apiClient.post('/studio-schedule-v2/sync/google-calendar');
  return response.data;
};

export const getSyncLogs = async () => {
  const response = await apiClient.get('/studio-schedule-v2/sync/logs');
  return response.data;
};

// Admin functions
export const getPendingRequests = async () => {
  const response = await apiClient.get('/studio-schedule-v2/admin/pending-requests');
  return response.data;
};

export const bulkUpdateBookings = async (bookingIds: string[], status: 'pending' | 'approved' | 'denied', adminNotes?: string) => {
  const response = await apiClient.patch('/studio-schedule-v2/admin/bulk-update', {
    bookingIds,
    status,
    adminNotes
  });
  return response.data;
};

export const createAdminBooking = async (bookingData: {
  studio_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  title: string;
  notes?: string;
  user_id?: string;
}) => {
  const response = await apiClient.post('/studio-schedule-v2/admin/bookings', bookingData);
  return response.data;
};
