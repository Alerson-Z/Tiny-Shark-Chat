export interface ApiConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface AllSettings {
  gemini: ApiConfig;
  openai: ApiConfig;
  cerebras: ApiConfig;
}

export interface MessagePart {
  type: 'text' | 'image';
  text?: string;
  data?: string; // Base64 encoded image data
  mimeType?: string; // e.g., 'image/jpeg', 'image/png'
}

export interface Message {
  role: 'user' | 'assistant';
  content: string | MessagePart[]; // Content can be a string or an array of parts
}

export type ApiProvider = 'gemini' | 'openai' | 'cerebras';

export interface ConversationMetadata {
  id: string;
  title: string;
  lastUpdated: number; // Timestamp
  provider: ApiProvider; // Store which provider was used for this conversation
}

export interface Conversation extends ConversationMetadata {
  messages: Message[];
}
