declare module '@site' {
  import type { ComponentType } from 'react'
  import type { Site } from './types'
  export const site: Site
  export const Page: ComponentType<{ site: Site }>
}
