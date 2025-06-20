// src/App.tsx
import React from 'react';
import SecureChatbot from './components/SecureChatbot/SecureChatbot';

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
          apiEndpoint: '/your-custom-chat-api', // Replace with your actual API endpoint
          maxMessageLength: 500,
          rateLimit: {
            maxMessages: 5,
            windowMs: 30000, // 30 seconds
          },
          // csrfToken: 'your-csrf-token-here', // If you're using CSRF protection
        }}
        onError={handleChatError}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
}

export default App;