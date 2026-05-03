export type EventType = 'relocation' | 'closure' | 'expansion' | 'new_plant' | 'tender' | 'other';

export interface RssSource {
  id: string;
  name: string;
  url: string;
  lastSync?: string;
  status: 'ok' | 'error' | 'pending';
  errorMessage?: string;
}

export interface NewsItem {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  link: string;
  pubDate: string;
  description: string;
  
  // AI Extracted
  eventType?: EventType;
  summaryTr?: string;
  company?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  sector?: string | null;

  // Calculated
  score?: number;
  confidence?: number;
}

export interface AppData {
  sources: RssSource[];
  news: NewsItem[];
}
