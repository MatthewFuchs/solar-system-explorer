import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Typefaces are self-hosted (SIL Open Font License), so the site makes no third-party requests.
import '@fontsource/marcellus/400.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/400-italic.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
