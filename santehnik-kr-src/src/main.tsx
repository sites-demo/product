import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from './App'
import { PHONE, TEL } from './data'
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
        <h1>Сантехник на вызов в Кривом Роге</h1>
        <a className="btn btn-call big" href={TEL}>
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

// В собранном сайте внутри #root лежит пререндер, в режиме разработки там пусто.
if (root.firstElementChild) {
  hydrateRoot(root, tree, {
    onRecoverableError: (err) => console.error('Ошибка гидрации', err),
  })
} else {
  createRoot(root).render(tree)
}
