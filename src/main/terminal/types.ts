import { ClientChannel } from 'ssh2'

export interface TerminalSession {
  id: string
  connectionId: string
  stream: ClientChannel | null
  cols: number
  rows: number
  active: boolean
}
