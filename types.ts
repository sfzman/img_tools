export type AppMode = 'multi-view' | 'expressions' | 'chibi' | 'remove-bg';

export interface ViewConfig {
  id: string;
  title: string;
  description: string;
  promptInstruction: string;
}

export interface GeneratedView {
  viewId: string;
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

export type ViewGenerationStatus = Record<string, GeneratedView>;