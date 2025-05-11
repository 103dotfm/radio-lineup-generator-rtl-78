
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupStrayDivCleaner } from './lib/utils.ts'
import { ensureProducerRoles } from './lib/supabase/producers/roles.ts'

// Setup the stray div cleaner to prevent UI blocking
setupStrayDivCleaner();

// Ensure producer roles are set up correctly at app startup
ensureProducerRoles()
  .then(() => console.log("Producer roles setup completed"))
  .catch(err => console.error("Failed to setup producer roles:", err));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
