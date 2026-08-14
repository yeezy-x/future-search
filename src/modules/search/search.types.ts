export interface SearxngSearchOptions {
  categories?: string[];
  engines?: string[];
  language?: string;
  pageno?: number;
}

export interface SearxngSearchResult {
  title: string;
  url: string;
  img_src?: string;
  thumbnail_src?: string;
  thumbnail?: string;
  content?: string;
  author?: string;
  iframe_src?: string;
  engine?: string;
  score?: number;
  publishedDate?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  content?: string;
  source?: string;
  score?: number;
  publishedAt?: string;
}