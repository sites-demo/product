import { createRoot, hydrateRoot } from 'react-dom/client'
import { site, Page } from '@site'
import { Shell } from './ui/Shell'
import './base.css'

const root = document.getElementById('root')!
const app = <Shell site={site}><Page site={site} /></Shell>
// Страница приходит уже свёрстанной, React только оживляет её.
if (root.firstElementChild) hydrateRoot(root, app)
else {
  document.title = site.title
  createRoot(root).render(app)
}
