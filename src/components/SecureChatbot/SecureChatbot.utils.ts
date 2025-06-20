// src/components/SecureChatbot/SecureChatbot.utils.ts

import { SUSPICIOUS_PATTERNS } from './SecureChatbot.constants';

export const SecurityUtils = {
  /**
   * Sanitizes HTML to prevent XSS attacks.
   * @param input The string to sanitize.
   * @returns The sanitized string.
   */
  sanitizeHtml: (input: string): string => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },

  /**
   * Validates input length and content for suspicious patterns.
   * @param input The string to validate.
   * @param maxLength The maximum allowed length for the input.
   * @returns True if the input is valid, false otherwise.
   */
  validateInput: (input: string, maxLength: number): boolean => {
    if (!input || typeof input !== 'string') return false;
    if (input.length > maxLength) return false;
    if (input.trim().length === 0) return false;

    return !SUSPICIOUS_PATTERNS.some(pattern => pattern.test(input));
  },

  /**
   * Generates a cryptographically secure UUID.
   * @returns A secure UUID string.
   */
  generateSecureId: (): string => {
    return crypto.randomUUID();
  },
};