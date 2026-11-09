import { createRoot } from 'react-dom/client'
import { Door } from '../src/niches/body/RepairSteps'
createRoot(document.getElementById('root')!).render(<>{[0, 1, 2, 3, 4].map(s => <div key={s}><Door stage={s} paint="#2c4a6e" /></div>)}</>)
