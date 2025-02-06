export interface Show {
  id: string;
  name: string;
  time: string;
  date: string;
  notes: string;
  created_at: string;
}

export interface ShowItem {
  id: string;
  show_id: string;
  name: string;
  title: string;
  details: string;
  phone: string;
  duration: number;
  is_break: boolean;
  is_note: boolean;
  position: number;
  interviewees?: Interviewee[];
}

export interface Interviewee {
  id: string;
  item_id: string;
  name: string;
  title: string;
  phone: string;
  duration: number;
  created_at: string;
}