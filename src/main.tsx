import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AudioPlaybackProvider } from './context/AudioPlaybackContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AudioPlaybackProvider>
        <App />
      </AudioPlaybackProvider>
    </BrowserRouter>
  </StrictMode>,
)
