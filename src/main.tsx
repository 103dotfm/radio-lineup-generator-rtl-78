
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/digital-work-arrangement.css'

// Force CSS reload
const forceReload = () => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './styles/digital-work-arrangement.css?v=' + new Date().getTime();
  document.head.appendChild(link);
  
  console.log('Force reloaded CSS');
};

// Execute after a short delay to ensure other scripts have loaded
setTimeout(forceReload, 1000);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
