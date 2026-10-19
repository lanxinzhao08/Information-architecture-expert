export interface PageLink {
    url: string;
    text: string;
}
    
export interface PageData {
  url: string;
  title: string;
  description?: string;
  headings: string[];
  links: PageLink[];
  content: string;
}