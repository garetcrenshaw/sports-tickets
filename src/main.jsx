import React from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { initSentry } from './lib/sentry'
import App from './App.jsx'
import './index.css'

// Initialize Sentry for error tracking (must be before React renders)
initSentry()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>
)