import type { DroneId } from './drone'

export type PayloadId =
  | 'zenmuse-h20'
  | 'zenmuse-h20t'
  | 'zenmuse-h20n'
  | 'zenmuse-h30'
  | 'zenmuse-h30t'
  | 'zenmuse-s1'
  | 'zenmuse-z30'
  | 'zenmuse-xt2'
  | 'zenmuse-xt2-25mm'

export type PayloadType = 'kamera' | 'thermal' | 'scheinwerfer'

export interface PayloadSpec {
  id: PayloadId
  name: string
  type: PayloadType
  description: string
  weight: number                // g
  compatibleDrones: DroneId[]
}
