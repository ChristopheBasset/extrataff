import React from 'react'
import ReactDOM from 'react-dom/client'
import { PostHogProvider } from 'posthog-js/react'
import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/pushNotifications'

const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
  person_profiles: 'identified_only',
  capture_pageview: true,
  capture_pageleave: true,
  session_recording: {
    recordCrossOriginIframes: false,
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY || 'phc_VlohRlSDbOBDS8T6ptmWDSEB825u8P7koun97aPYH9j'}
      options={posthogOptions}
    >
      <App />
    </PostHogProvider>
  </React.StrictMode>,
)

// Enregistrer le Service Worker
registerServiceWorker()
