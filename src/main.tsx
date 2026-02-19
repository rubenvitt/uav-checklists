import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Clear weather & nearby caches on every page load so data is always fresh
localStorage.removeItem('weather_cache')
for (let i = localStorage.length - 1; i >= 0; i--) {
  const key = localStorage.key(i)
  if (key?.startsWith('nearby_')) localStorage.removeItem(key)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
