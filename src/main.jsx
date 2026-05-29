import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Global fetch interceptor to automatically inject the JWT token into all relative /api/ requests
const { fetch: originalFetch } = window;
window.fetch = async (...args) => {
  let [resource, config] = args;
  
  if (typeof resource === 'string' && resource.startsWith('/api/')) {
    config = config || {};
    config.headers = config.headers || {};
    
    // Check if user is logged in and has a token in localStorage
    const storedUser = localStorage.getItem('temikia-crm-user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user && user.token) {
          config.headers['Authorization'] = `Bearer ${user.token}`;
        }
      } catch (e) {
        // Safe fallback if JSON parsing fails
      }
    }
  }
  const response = await originalFetch(resource, config);
  
  // Intercept authentication/authorization failures (expired session, revoked token)
  if (typeof resource === 'string' && resource.startsWith('/api/') && (response.status === 401 || response.status === 403)) {
    localStorage.removeItem('temikia-crm-user');
    window.dispatchEvent(new Event('temikia-auth-expired'));
  }
  
  return response;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
