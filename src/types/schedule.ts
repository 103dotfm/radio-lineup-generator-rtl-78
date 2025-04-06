
// Type definitions for scheduling components

export interface DigitalWorkArrangement {
  id: string;
  week_start: string;
  notes: string | null;
  footer_text: string | null;
  footer_image_url: string | null;
}

export interface ShiftWorker {
  id: string;
  name: string;
  email?: string;
}
