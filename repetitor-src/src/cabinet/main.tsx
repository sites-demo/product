import { createRoot } from 'react-dom/client';
import Cabinet from './Cabinet';
import { typeset } from '../lib/typo';
import '../ui/base.css';
import './cabinet.css';

typeset();
createRoot(document.getElementById('root')!).render(<Cabinet />);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js'));
}
