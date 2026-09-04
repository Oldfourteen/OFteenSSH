import { Client } from 'ssh2'
import { ConnectionStatus, SSHConnectionConfig } from '../../shared/types'

export interface SSHConnectionState {
  id: string
  config: SSHConnectionConfig
  client: Client | null
  status: ConnectionStatus
  connectedAt: number | null
  reconnectAttempt: number
  maxReconnectAttempts: number
}
