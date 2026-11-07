import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from './App'
import { NAME, PHONE, TEL } from './data'
import './styles.css'

// Что бы ни случилось в приложении, телефон со страницы не исчезает.
class Safety extends Component<{ children: ReactNode }, { bad: boolean }> {
  state = { bad: false }
  static getDerivedStateFromError() {
    return { bad: true }
  }
  render() {
    if (!this.state.bad) return this.props.children
    return (
      <main className="wrap crash">
        <h1>{NAME}</h1>
        <a className="btn btn-amber" href={TEL}>
          {PHONE}
        </a>
      </main>
    )
  }
}

const root = document.getElementById('root') as HTMLElement
const tree = (
  <StrictMode>
    <Safety>
      <App />
    </Safety>
  </StrictMode>
)

if (root.firstElementChild) {
  hydrateRoot(root, tree, { onRecoverableError: (err) => console.error('Ошибка гидрации', err) })
} else {
  createRoot(root).render(tree)
}

// Плавное появление блоков при прокрутке.
const io = new IntersectionObserver(
  (es) =>
    es.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in')
        io.unobserve(e.target)
      }
    }),
  { rootMargin: '0px 0px -8% 0px' },
)
requestAnimationFrame(() => document.querySelectorAll('.sec-head, .rooms-grid, .ny-grid, .bk-grid, .frost-grid, .way-grid, .revs-in, .faq-grid').forEach((el) => io.observe(el)))
