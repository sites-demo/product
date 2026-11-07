import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

const root = document.getElementById('root')!
// Страница приходит уже свёрстанной, React только оживляет её.
if (root.firstElementChild) hydrateRoot(root, <App />)
else createRoot(root).render(<App />)
