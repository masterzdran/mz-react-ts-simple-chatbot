// src/components/SecureChatbot/MessageBubble.tsx

import React from 'react';
import type { Message } from './SecureChatbot.types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  let bubbleClass = '';
  if (message.sender === 'user') {
    bubbleClass = 'bg-blue-600 text-white';
  } else if (message.status === 'error') {
    bubbleClass = 'bg-red-100 text-red-800';
  } else {
    bubbleClass = 'bg-gray-100 text-gray-800';
  }

  return (
    <div
      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-xs px-3 py-2 rounded-lg text-sm ${bubbleClass}`}
      >
        {message.content || (message.status === 'sending' && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(MessageBubble);