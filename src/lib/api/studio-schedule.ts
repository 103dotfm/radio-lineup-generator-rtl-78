import { apiClient } from '../api-client';

// Basic Studio & Booking APIs
export const getStudios = async () => {
  const response = await apiClient.get('/studio-schedule-enhanced/studios');
  return response.data;
};

export const getBookings = async (startDate, endDate) => {
  const response = await apiClient.get('/studio-schedule-enhanced/bookings', {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data;
};

export const createBooking = async (bookingData) => {
  const response = await apiClient.post('/studio-schedule-enhanced/bookings', bookingData);
  return response.data;
};

export const updateBookingStatus = async (id, status, adminNotes = '') => {
  const response = await apiClient.patch(`/studio-schedule-enhanced/bookings/${id}`, { 
    status,
    admin_notes: adminNotes 
  });
  return response.data;
};

// Admin functions
export const createAdminBooking = async (bookingData) => {
  const response = await apiClient.post('/studio-schedule-enhanced/admin/bookings', bookingData);
  return response.data;
};

export const deleteBooking = async (id) => {
  const response = await apiClient.delete(`/studio-schedule-enhanced/bookings/${id}`);
  return response.data;
};

// Admin: Pending Requests
export const getPendingRequests = async () => {
  const response = await apiClient.get('/studio-schedule-enhanced/admin/pending-requests');
  return response.data;
};

export const bulkUpdateBookings = async (bookingIds, status, adminNotes = '') => {
  const response = await apiClient.post('/studio-schedule-enhanced/admin/bulk-update', {
    booking_ids: bookingIds,
    status,
    admin_notes: adminNotes
  });
  return response.data;
};

// Admin: Google Calendar Sync
export const importFromGoogleCalendar = async () => {
  const response = await apiClient.post('/studio-schedule-enhanced/sync/import');
  return response.data;
};

export const clearGoogleCalendarBookings = async () => {
  const response = await apiClient.post('/studio-schedule-enhanced/sync/clear');
  return response.data;
};

export const deduplicateBookings = async () => {
  const response = await apiClient.post('/studio-schedule-enhanced/sync/deduplicate');
  return response.data;
};

export const getSyncLogs = async () => {
  const response = await apiClient.get('/studio-schedule-enhanced/sync/logs');
  return response.data;
};

// Admin: Approvers Management
export const getApprovers = async () => {
  const response = await apiClient.get('/studio-schedule-enhanced/admin/approvers');
  return response.data;
};

export const addApprover = async (userId) => {
  const response = await apiClient.post('/studio-schedule-enhanced/admin/approvers', {
    user_id: userId
  });
  return response.data;
};

export const removeApprover = async (approverId) => {
  const response = await apiClient.delete(`/studio-schedule-enhanced/admin/approvers/${approverId}`);
  return response.data;
}; 