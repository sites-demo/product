import { renderToString } from 'react-dom/server'
import { site, Page } from '@site'
import { Shell } from './ui/Shell'

export { site }
export const render = () => renderToString(<Shell site={site}><Page site={site} /></Shell>)
