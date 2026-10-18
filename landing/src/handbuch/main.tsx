import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import './handbuch.css'
import Handbuch from './Handbuch'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Handbuch />
  </StrictMode>,
)
