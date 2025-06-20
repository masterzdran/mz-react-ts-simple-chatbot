// src/components/SecureChatbot/SecureChatbot.constants.ts

import { ChatbotConfig } from './SecureChatbot.types';

export const DEFAULT_CHATBOT_CONFIG: Required<ChatbotConfig> = {
  apiEndpoint: '/api/chat',
  maxMessageLength: 1000,
  rateLimit: { maxMessages: 10, windowMs: 60000 },
  allowedOrigins: [window.location.origin],
  csrfToken: '',
};

export const SUSPICIOUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:text\/html/gi,
];