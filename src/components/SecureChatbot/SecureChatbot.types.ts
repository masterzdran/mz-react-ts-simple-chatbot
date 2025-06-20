// src/components/SecureChatbot/SecureChatbot.types.ts

export interface Message {
    id: string;
    content: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    status: 'sending' | 'sent' | 'error';
  }
  
  export interface ChatbotConfig {
    apiEndpoint?: string;
    maxMessageLength?: number;
    rateLimit?: {
      maxMessages: number;
      windowMs: number;
    };
    allowedOrigins?: string[];
    csrfToken?: string;
  }
  
  export interface ChatbotProps {
    config?: ChatbotConfig;
    onError?: (error: Error) => void;
    onMessageSent?: (message: string) => void;
  }