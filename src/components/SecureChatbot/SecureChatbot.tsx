// src/components/SecureChatbot/SecureChatbot.tsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, MessageCircle, X, Shield, AlertTriangle, Maximize2, Minimize2, Plus } from 'lucide-react';
import type { Message, ChatbotProps } from './SecureChatbot.types';
import { DEFAULT_CHATBOT_CONFIG } from './SecureChatbot.constants';
import { SecurityUtils } from './SecureChatbot.utils';
import { useRateLimit } from './useRateLimit.hook';
import MessageBubble from './MessageBubble';
import {
  Box,
  IconButton,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Paper,
  useTheme,
  styled,
} from '@mui/material';
import Markdown from 'mui-markdown';

const StyledPaper = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
}));

const StyledHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderTopLeftRadius: theme.shape.borderRadius,
  borderTopRightRadius: theme.shape.borderRadius,
}));

const StyledMessages = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(2),
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
}));

const StyledInput = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

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
  const [sessionId, setSessionId] = useState<string>(SecurityUtils.generateSecureId());

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

  const generateMockResponse = useCallback((message: string): string => {
    // Basic mock response logic
    const responses = [
      "I'm sorry, I don't have the information to answer that.",
      "That's an interesting question!",
      "Let me look that up for you...",
      "Could you please provide more details?",
      "Thank you for your input!",
    ];
    const index = Math.floor(Math.random() * responses.length);
    return responses[index] + ` (Mock Response to: ${message})`;
  }, []);

  // Secure API call
  const sendMessageToAPI = useCallback(async (message: string): Promise<string> => {
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
      session_id: sessionId, // Include session_id in the request
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
        // If the service is unavailable, generate a mock response
        console.warn('Failed to fetch from API, generating mock response.');
        return generateMockResponse(message);
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
      // If an error occurs during the fetch, generate a mock response
      console.error('Error during API call, generating mock response:', error);
      return generateMockResponse(message);
    }
  }, [chatConfig, generateMockResponse, sessionId]);

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

  const handleNewSession = useCallback(() => {
    setMessages([]); // Clear messages
    setSessionId(SecurityUtils.generateSecureId()); // Generate a new session ID
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

  const theme = useTheme();

  const chatbotTitle = chatConfig.title || "Support Chat";

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: theme.spacing(4),
        right: theme.spacing(4),
        zIndex: 50,
      }}
    >
      {/* Chat Window */}
      {isOpen && (
        <StyledPaper
          sx={{
            mb: theme.spacing(2),
            width: isMaximized ? 'auto' : 320,
            height: isMaximized ? 'auto' : 480,
            maxWidth: isMaximized ? 'calc(100vw - 32px)' : 'auto',
            maxHeight: isMaximized ? 'calc(100vh - 160px)' : 'auto',
            position: isMaximized ? 'fixed' : 'static',
            top: isMaximized ? theme.spacing(4) : 'auto',
            left: isMaximized ? theme.spacing(4) : 'auto',
            right: isMaximized ? theme.spacing(4) : 'auto',
            bottom: isMaximized ? theme.spacing(20) : 'auto',
            transition: theme.transitions.create(['width', 'height', 'top', 'left', 'right', 'bottom'], {
              duration: theme.transitions.duration.standard,
              easing: theme.transitions.easing.easeInOut,
            }),
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <StyledHeader>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
              {StatusIcon}
              <Typography variant="h6" component="h3">
                {chatbotTitle}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
              <IconButton
                onClick={handleNewSession}
                color="inherit"
                aria-label="New Session"
              >
                <Plus />
              </IconButton>
              <IconButton
                onClick={toggleMaximize}
                color="inherit"
                aria-label={isMaximized ? "Minimize chat" : "Maximize chat"}
              >
                {isMaximized ? <Minimize2 /> : <Maximize2 />}
              </IconButton>
              <IconButton
                onClick={toggleChatbot}
                color="inherit"
                aria-label="Close chat"
              >
                <X />
              </IconButton>
            </Box>
          </StyledHeader>
          {/* Messages */}
          <StyledMessages>
            {messages.length === 0 && (
              <Typography variant="body2" color="textSecondary" align="center">
                Welcome! How can I help you today?
              </Typography>
            )}
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} assistantIcon={chatConfig.assistantIcon} />
            ))}
            <div ref={messagesEndRef} />
          </StyledMessages>
          {/* Input */}
          <StyledInput>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
              <TextField
                inputRef={inputRef}
                fullWidth
                variant="outlined"
                placeholder="Type your message..."
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                inputProps={{ maxLength: chatConfig.maxMessageLength }}
                autoComplete="off"
                spellCheck="true"
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                aria-label="Send message"
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : <Send />}
              </Button>
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
              {inputValue.length}/{chatConfig.maxMessageLength}
            </Typography>
          </StyledInput>
        </StyledPaper>
      )}
      {/* Toggle Button */}
      <Button
        variant="contained"
        color="primary"
        onClick={toggleChatbot}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          boxShadow: theme.shadows[3],
          transition: theme.transitions.create('background-color'),
          '&:hover': {
            backgroundColor: theme.palette.primary.dark,
          },
        }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </Button>
    </Box>
  );
};

export default SecureChatbot;