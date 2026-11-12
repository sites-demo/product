import { createRoot } from 'react-dom/client'
import './styles.css'
import { App } from './App'
import { initTg } from './tg'

initTg()
createRoot(document.getElementById('root')!).render(<App />)
