// src/components/SecureChatbot/useRateLimit.hook.ts

import { useState, useCallback } from 'react';

/**
 * Custom hook for client-side rate limiting.
 * @param maxMessages The maximum number of messages allowed within the window.
 * @param windowMs The time window in milliseconds.
 * @returns An object containing `canSendMessage` and `recordMessage` functions.
 */
export const useRateLimit = (maxMessages: number, windowMs: number) => {
  const [messageTimestamps, setMessageTimestamps] = useState<number[]>([]);

  /**
   * Checks if a new message can be sent based on the rate limit.
   * @returns True if a message can be sent, false otherwise.
   */
  const canSendMessage = useCallback(() => {
    const now = Date.now();
    const recentMessages = messageTimestamps.filter(
      timestamp => (now - timestamp) < windowMs
    );
    return recentMessages.length < maxMessages;
  }, [messageTimestamps, maxMessages, windowMs]);

  /**
   * Records a new message timestamp for rate limiting.
   */
  const recordMessage = useCallback(() => {
    const now = Date.now();
    setMessageTimestamps(prev => [...prev.filter(ts => (now - ts) < windowMs), now]);
  }, [windowMs]);

  return { canSendMessage, recordMessage };
};