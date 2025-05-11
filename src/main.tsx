
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// Import Supabase initialization to run it at startup
import './lib/supabase/init';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
