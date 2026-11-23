import { createRoot } from 'react-dom/client';
import App from './App';
import { typeset } from '../lib/typo';
import '../ui/base.css';
import './client.css';
import './theme-evening.css';
import './theme-ivory.css';

const THEME = import.meta.env.VITE_THEME;
if (THEME) document.documentElement.dataset.theme = THEME;

typeset();
createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js'));
}
