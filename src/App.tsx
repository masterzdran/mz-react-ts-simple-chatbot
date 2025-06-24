// src/App.tsx
import React from 'react';
import SecureChatbot from './components/SecureChatbot/SecureChatbot';
import Avatar from '@mui/material/Avatar';

function App() {
  const handleChatError = (error: Error) => {
    console.error("An error occurred in the chatbot:", error.message);
    // Potentially display a user-friendly error message in the main app
  };

  const handleMessageSent = (message: string) => {
    console.log("User sent message:", message);
    // You could log this to an analytics service or perform other actions
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>My Application</h1>
        <p>This is the main content of your application.</p>
      </header>
      <SecureChatbot
        config={{
          apiEndpoint: '/api/chat',
          maxMessageLength: 500,
          rateLimit: {
            maxMessages: 5,
            windowMs: 30000,
          },
          assistantIcon: <Avatar>A</Avatar>, // Example: Material-UI Avatar
        }}
        onError={handleChatError}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
}

export default App;