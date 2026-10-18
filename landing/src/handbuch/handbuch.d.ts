declare module 'virtual:handbuch' {
  export interface Abschnitt {
    id: string
    titel: string
  }
  export interface Kapitel {
    slug: string
    nummer: string
    titel: string
    kurz: string
    html: string
    abschnitte: Abschnitt[]
  }
  export const kapitel: Kapitel[]
}
