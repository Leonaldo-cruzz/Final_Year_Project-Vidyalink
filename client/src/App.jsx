import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes';
import { getAIHealth } from './services/aiService';

function App() {
  // Wake the API and AI services early (Render free tier sleeps when idle),
  // so the first real request doesn't pay the whole cold-start cost.
  useEffect(() => {
    getAIHealth().catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
