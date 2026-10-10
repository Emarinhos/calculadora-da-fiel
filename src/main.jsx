import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonte do próprio app (não depende do Google Fonts, que pode estar bloqueado no aparelho)
import '@fontsource/fjalla-one/latin-400.css'
import '@fontsource/fjalla-one/latin-ext-400.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
