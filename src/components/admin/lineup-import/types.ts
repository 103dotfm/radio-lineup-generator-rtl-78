export interface ParsedLineupItem {
  name: string;
  title: string;
  phone: string;
}

export interface ParsedLineupData {
  showName: string;
  showDate: string | null;
  showTime: string | null;
  items: ParsedLineupItem[];
  warnings?: string[];
  rawHtml?: string;
}

export interface ParseResult {
  filename: string;
  success: boolean;
  data: ParsedLineupData | null;
  error: string | null;
}

export interface SaveResult {
  success: boolean;
  showId?: string;
  itemsCreated?: number;
  itemsFailed?: number;
  error?: string;
}



