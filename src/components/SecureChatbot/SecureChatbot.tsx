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
import i18n from '../../i18n';
import { useTranslation } from 'react-i18next';

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

interface SecureChatbotProps extends ChatbotProps {
  language?: string;
}

const SecureChatbot: React.FC<SecureChatbotProps> = ({
  config = {},
  onError,
  onMessageSent,
  language = 'en', // Default language is English
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

  // i18n
  const { t } = useTranslation();

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

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
    const responses = {
      en: [
        t("Sorry, I don't have the information to answer that."),
        t("That's an interesting question!"),
        t("Let me look that up for you..."),
        t("Could you please provide more details?"),
        t("Thank you for your input!"),
      ],
      fr: [
        t("Désolé, je n'ai pas les informations nécessaires pour répondre à cette question."),
        t("C'est une question intéressante!"),
        t("Laissez-moi chercher cela pour vous..."),
        t("Pourriez-vous fournir plus de détails?"),
        t("Merci pour votre contribution!"),
      ],
      pt: [
        t("Desculpe, não tenho as informações para responder a isso."),
        t("Essa é uma pergunta interessante!"),
        t("Deixe-me procurar isso para você..."),
        t("Poderia fornecer mais detalhes?"),
        t("Obrigado pela sua contribuição!"),
      ],
    };
    const currentLanguage = i18n.language || 'en';
    const index = Math.floor(Math.random() * responses[currentLanguage].length);
    return responses[currentLanguage][index] + ` (Mock Response to: ${message})`;
  }, [t]);

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
          ? { ...msg, content: t("Sorry, I encountered an error. Please try again."), status: 'error' as const }
          : msg
      ));
      handleError(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, chatConfig.maxMessageLength, canSendMessage, recordMessage, onMessageSent, sendMessageToAPI, handleError, t]);

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

  const chatbotTitle = chatConfig.title || t("Support Chat");

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
                aria-label={t("New Session")}
              >
                <Plus />
              </IconButton>
              <IconButton
                onClick={toggleMaximize}
                color="inherit"
                aria-label={isMaximized ? t("Minimize chat") : t("Maximize chat")}
              >
                {isMaximized ? <Minimize2 /> : <Maximize2 />}
              </IconButton>
              <IconButton
                onClick={toggleChatbot}
                color="inherit"
                aria-label={t("Close chat")}
              >
                <X />
              </IconButton>
            </Box>
          </StyledHeader>
          {/* Messages */}
          <StyledMessages>
            {messages.length === 0 && (
              <Typography variant="body2" color="textSecondary" align="center">
                {t("Welcome! How can I help you today?")}
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
                placeholder={t("Type your message...")}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
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
                aria-label={t("Send message")}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : <Send />}
              </Button>
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
              {inputValue.length}/{chatConfig.maxMessageLength} {t("characters")}
            </Typography>
            {chatConfig.disclaimer && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                {chatConfig.disclaimer}
              </Typography>
            )}
          </StyledInput>
        </StyledPaper>
      )}
      {/* Toggle Button */}
      <Button
        variant="contained"
        color="primary"
        onClick={toggleChatbot}
        aria-label={isOpen ? t('Close chat') : t('Open chat')}
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