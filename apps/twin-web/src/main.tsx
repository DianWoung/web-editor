import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// React 19 dev StrictMode double-mount currently causes the shared r3f canvas to lose its WebGL context.
createRoot(document.getElementById('root')!).render(<App />)
