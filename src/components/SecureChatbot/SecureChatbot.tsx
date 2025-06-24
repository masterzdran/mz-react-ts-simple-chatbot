// src/components/SecureChatbot/SecureChatbot.tsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, MessageCircle, X, Shield, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import type { Message, ChatbotProps } from './SecureChatbot.types';
import { DEFAULT_CHATBOT_CONFIG } from './SecureChatbot.constants';
import { SecurityUtils } from './SecureChatbot.utils';
import { useRateLimit } from './useRateLimit.hook';
import MessageBubble from './MessageBubble';

const SecureChatbot: React.FC<ChatbotProps> = ({
  config = {},
  onError,
  onMessageSent,
}) => {
  // State management
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Configuration with defaults
  const chatConfig = useMemo(() => ({
    ...DEFAULT_CHATBOT_CONFIG,
    ...config,
    rateLimit: {
      ...DEFAULT_CHATBOT_CONFIG.rateLimit,
      ...config.rateLimit,
    },
  }), [config]);

  // Rate limiting
  const { canSendMessage, recordMessage } = useRateLimit(
    chatConfig.rateLimit.maxMessages,
    chatConfig.rateLimit.windowMs
  );

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Error handler
  const handleError = useCallback((error: Error) => {
    console.error('Chatbot error:', error);
    setConnectionStatus('error');
    onError?.(error);
  }, [onError]);

  // Secure API call
  const sendMessageToAPI = useCallback(async (message: string): Promise<string> => {

    // TODO: Implement logic
     //return SecurityUtils.sanitizeHtml(message);;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    if (chatConfig.csrfToken) {
      headers['X-CSRF-Token'] = chatConfig.csrfToken;
    }

    const requestBody = {
      message: SecurityUtils.sanitizeHtml(message),
      timestamp: Date.now(),
      fingerprint: btoa(JSON.stringify({
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })),
    };

    try {
      const response = await fetch(chatConfig.apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Invalid response content type');
      }

      const data = await response.json();

      if (!data || typeof data.reply !== 'string') {
        throw new Error('Invalid response format');
      }
      return SecurityUtils.sanitizeHtml(data.reply);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      throw error;
    }
  }, [chatConfig]);

  // Handle input change with validation
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= chatConfig.maxMessageLength) {
      setInputValue(value);
    }
  }, [chatConfig.maxMessageLength]);

  // Send message handler
  const handleSendMessage = useCallback(async () => {
    const trimmedInput = inputValue.trim();

    if (!trimmedInput) return;

    if (!SecurityUtils.validateInput(trimmedInput, chatConfig.maxMessageLength)) {
      handleError(new Error('Invalid message content'));
      return;
    }

    if (!canSendMessage()) {
      handleError(new Error('Rate limit exceeded. Please wait before sending another message.'));
      return;
    }

    recordMessage();

    const userMessage: Message = {
      id: SecurityUtils.generateSecureId(),
      content: trimmedInput,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
    };

    const botMessage: Message = {
      id: SecurityUtils.generateSecureId(),
      content: '',
      sender: 'bot',
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages(prev => [...prev, userMessage, botMessage]);
    setInputValue('');
    setIsLoading(true);
    setConnectionStatus('connected');

    try {
      onMessageSent?.(trimmedInput);
      const reply = await sendMessageToAPI(trimmedInput);

      setMessages(prev => prev.map(msg =>
        msg.id === botMessage.id
          ? { ...msg, content: reply, status: 'sent' as const }
          : msg
      ));
    } catch (error) {
      setMessages(prev => prev.map(msg =>
        msg.id === botMessage.id
          ? { ...msg, content: 'Sorry, I encountered an error. Please try again.', status: 'error' as const }
          : msg
      ));
      handleError(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, chatConfig.maxMessageLength, canSendMessage, recordMessage, onMessageSent, sendMessageToAPI, handleError]);

  // Handle Enter key
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage, isLoading]);

  // Toggle chatbot
  const toggleChatbot = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Toggle maximize/minimize
  const toggleMaximize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up
    setIsMaximized(prev => !prev);
  }, []);

  // Status icon based on connection
  const StatusIcon = useMemo(() => {
    switch (connectionStatus) {
      case 'connected':
        return <Shield className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-gray-500" />;
    }
  }, [connectionStatus]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div 
          className={`mb-4 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col ${
            isMaximized 
              ? 'fixed top-4 left-4 right-4 bottom-20 w-auto h-auto' 
              : 'w-80 h-96'
          } transition-all duration-300 ease-in-out`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center space-x-2">
              {StatusIcon}
              <h3 className="font-semibold">Support Chat</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMaximize}
                className="text-white hover:text-gray-200 transition-colors"
                aria-label={isMaximized ? "Minimize chat" : "Maximize chat"}
              >
                {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleChatbot}
                className="text-white hover:text-gray-200 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 text-sm">
                Welcome! How can I help you today?
              </div>
            )}
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                disabled={isLoading}
                maxLength={chatConfig.maxMessageLength}
                autoComplete="off"
                spellCheck="true"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {inputValue.length}/{chatConfig.maxMessageLength}
            </div>
          </div>
        </div>
      )}
      {/* Toggle Button */}
      <button
        onClick={toggleChatbot}
        className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors flex items-center justify-center"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
};

export default SecureChatbot;