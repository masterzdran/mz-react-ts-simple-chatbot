// src/components/SecureChatbot/MessageBubble.tsx

import React from 'react';
import { Box, Paper, Typography, CircularProgress, useTheme } from '@mui/material';
import type { Message } from './SecureChatbot.types';

interface MessageBubbleProps {
  message: Message;
  assistantIcon?: React.ReactNode;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, assistantIcon }) => {
  const theme = useTheme();

  const isUser = message.sender === 'user';
  const isError = message.status === 'error';
  const isSending = message.status === 'sending';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 1,
        alignItems: 'flex-start',
      }}
    >
      {!isUser && assistantIcon && (
        <Box sx={{ mr: 1, mt: 0.5 }}>{assistantIcon}</Box>
      )}
      <Paper
        elevation={0}
        sx={{
          maxWidth: '85%',
          p: 1.5,
          borderRadius: 2,
          bgcolor: isUser
            ? 'primary.main'
            : isError
              ? 'error.light'
              : 'grey.100',
          color: isUser
            ? 'primary.contrastText'
            : isError
              ? 'error.dark'
              : 'text.primary',
          borderTopRightRadius: isUser ? 0 : 2,
          borderTopLeftRadius: isUser ? 2 : 0,
        }}
      >
        {isSending ? (
          <Box sx={{ display: 'flex', gap: 0.5, px: 1 }}>
            <Box sx={{
              width: 6,
              height: 6,
              bgcolor: 'currentColor',
              borderRadius: '50%',
              animation: 'pulse 1s infinite',
              animationDelay: '0s',
              '@keyframes pulse': {
                '0%': { opacity: 0.4 },
                '50%': { opacity: 1 },
                '100%': { opacity: 0.4 },
              }
            }} />
            <Box sx={{
              width: 6,
              height: 6,
              bgcolor: 'currentColor',
              borderRadius: '50%',
              animation: 'pulse 1s infinite',
              animationDelay: '0.3s'
            }} />
            <Box sx={{
              width: 6,
              height: 6,
              bgcolor: 'currentColor',
              borderRadius: '50%',
              animation: 'pulse 1s infinite',
              animationDelay: '0.6s'
            }} />
          </Box>
        ) : (
          <Typography variant="body2">{message.content}</Typography>
        )}
      </Paper>
    </Box>
  );
};

export default React.memo(MessageBubble);