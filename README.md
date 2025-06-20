# SecureChatbot

A secure, embeddable chatbot React component with built-in input validation, rate limiting, CSRF protection, and XSS sanitization. Designed for easy integration into React apps or as a compiled widget for static HTML pages.

---

## Features

- **Secure API calls** with CSRF token support
- **Input validation** and XSS sanitization
- **Rate limiting** to prevent spam
- **Customizable** via props/config
- **Accessible** and keyboard-friendly UI
- **Status indicators** for connection and errors

---

## Installation

```sh
npm install secure-chatbot-react
```

---

## Usage

### 1. As a React Component

```tsx
import SecureChatbot from './src/components/SecureChatbot/SecureChatbot';

function App() {
  return (
    <div>
      <h1>My App</h1>
      <SecureChatbot
        config={{
          apiEndpoint: '/api/chat',
          csrfToken: 'YOUR_CSRF_TOKEN',
          maxMessageLength: 300,
          rateLimit: { maxMessages: 5, windowMs: 60000 }
        }}
        onError={error => console.error(error)}
        onMessageSent={msg => console.log('User sent:', msg)}
      />
    </div>
  );
}

export default App;
```

#### Props

| Prop           | Type     | Description                                                                 |
|----------------|----------|-----------------------------------------------------------------------------|
| `config`       | object   | Configuration object (API endpoint, CSRF token, max message length, etc.)   |
| `onError`      | function | Callback for error handling                                                 |
| `onMessageSent`| function | Callback when a user message is sent                                        |

---

### 2. As a Compiled Widget in HTML

After building your project (e.g., with Vite), include the compiled JS and CSS in your HTML:

```html
<!-- Place this where you want the chatbot to appear -->
<div id="my-chatbot"></div>

<!-- Include the compiled JS bundle (adjust path as needed) -->
<script src="/dist/secure-chatbot-react.umd.js"></script>
<link rel="stylesheet" href="/dist/style.css" />

<script>
  // Assuming the UMD build exposes SecureChatbot as a global
  SecureChatbot.mount('#my-chatbot', {
    apiEndpoint: '/api/chat',
    csrfToken: 'YOUR_CSRF_TOKEN',
    maxMessageLength: 300,
    rateLimit: { maxMessages: 5, windowMs: 60000 }
  });
</script>
```

> **Note:**  
> The actual global name and mount method depend on your build setup. You may need to adapt the example above to match your UMD/IIFE export.

---

## Security

- All user input is sanitized before sending and displaying.
- CSRF token is included in API requests if provided.
- Rate limiting is enforced client-side.

---

## Customization

You can override styles using Tailwind or your own CSS, and extend the component via props.

---

## License

MIT

---


## Integrating the Remote API

The `SecureChatbot` component sends user messages to your backend API using the `sendMessageToAPI` function.  
To integrate with your own backend, your API endpoint should accept a POST request with the following JSON body:

```json
{
  "message": "User's message (sanitized)",
  "timestamp": 1718880000000,
  "fingerprint": "base64-encoded user fingerprint"
}
```

### Example API Endpoint (Node.js/Express)

```js
app.post('/api/chat', (req, res) => {
  const { message, timestamp, fingerprint } = req.body;

  // Validate and sanitize input as needed
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Invalid message' });
  }

  // Your chatbot logic here (call AI, database, etc.)
  const reply = `Echo: ${message}`;

  res.json({ reply });
});
```

### Expected API Response

Your API should respond with a JSON object containing a `reply` string:

```json
{
  "reply": "This is the bot's response."
}
```

- The `reply` field will be sanitized and displayed in the chat UI.
- If the response is not valid JSON or does not contain a `reply` string, the chatbot will show an error message.

### CSRF Protection

If you require CSRF protection, provide a `csrfToken` in the `config` prop.  
The component will send it as an `X-CSRF-Token` header with each request.

```tsx
<SecureChatbot
  config={{
    apiEndpoint: '/api/chat',
    csrfToken: 'YOUR_CSRF_TOKEN'
  }}
/>
```

---

**Note:**  
- The API endpoint URL is set via the `apiEndpoint` property in the `config` prop.
- The component expects a JSON response with a `reply` field.
- All requests are sent with `Content-Type: application/json` and `X-Requested-With: XMLHttpRequest` headers.
---

## Contributors

We welcome contributions! To contribute:

- Fork the repository
- Create a new branch for your feature or bugfix
- Submit a pull request with a clear description

### Project Contributors

- [Your Name Here](https://github.com/your-github) – Creator & Maintainer

If you contributed and want your name here, open a PR or issue!

---