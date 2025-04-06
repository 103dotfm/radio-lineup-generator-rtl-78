
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupStrayDivCleaner } from './lib/utils.ts'

// Setup the stray div cleaner to prevent UI blocking
setupStrayDivCleaner();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
