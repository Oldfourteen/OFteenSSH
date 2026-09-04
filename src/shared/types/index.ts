export * from './ipc-channels'

// ===== SSH 相关类型 =====

export type AuthType = 'password' | 'privatekey'

export type ConnectionGroup = 'internal' | 'external'

export interface SSHConnectionConfig {
  id: string
  name: string
  host: string
  port: number
  username: string
  authType: AuthType
  group: ConnectionGroup
  /** 密钥文件路径（authType 为 privatekey 时使用） */
  privateKeyPath?: string
  /** 标签/颜色标记 */
  color?: string
  /** 排序序号 */
  order: number
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed'

export interface ConnectionResult {
  success: boolean
  message?: string
  connectionId?: string
}

// ===== 终端相关类型 =====

export interface TerminalSession {
  id: string
  connectionId: string
  cols: number
  rows: number
  active: boolean
}

// ===== 监控数据类型 =====

export interface MemoryInfo {
  total: number
  used: number
  available: number
  usagePercent: number
}

export interface DiskInfo {
  filesystem: string
  mount: string
  total: number
  used: number
  available: number
  usagePercent: number
}

export interface CpuInfo {
  load1: number
  load5: number
  load15: number
  cores: number
  modelName: string
}

export interface SystemInfo {
  hostname: string
  os: string
  kernel: string
  arch: string
  uptime: number
}

export interface ProcessInfo {
  user: string
  pid: number
  cpuPercent: number
  memPercent: number
  command: string
  /** 进程状态，如 R/S/Z（完整列表时提供） */
  state?: string
  /** 父进程 PID */
  ppid?: number
}

export type ProcessKillSignal = 'TERM' | 'KILL'

export interface ProcessListResult {
  success: boolean
  processes: ProcessInfo[]
  message?: string
}

export interface ProcessActionResult {
  success: boolean
  message?: string
  /** 新启动进程的 PID */
  pid?: number
}

export interface MonitorPayload {
  connectionId: string
  timestamp: number
  memory: MemoryInfo
  disk: DiskInfo[]
  cpu: CpuInfo
  system: SystemInfo
  topProcesses: ProcessInfo[]
}

export interface NetworkInterfaceSpeed {
  name: string
  downloadSpeed: number // bytes/s
  uploadSpeed: number // bytes/s
}

export interface NetworkSpeedPayload {
  connectionId: string
  timestamp: number
  interfaces: NetworkInterfaceSpeed[]
}

export interface NetworkDataPoint {
  timestamp: number
  downloadSpeed: number
  uploadSpeed: number
}

export interface DiskDataPoint {
  timestamp: number
  /** mount -> usagePercent */
  mounts: Record<string, number>
}

// ===== 进程守卫 =====

export interface ProcessGuardRule {
  id: string
  connectionId: string
  name: string
  /** pgrep -f 匹配模式 */
  match: string
  /** 进程不存在时执行的启动命令 */
  startCommand: string
  enabled: boolean
  status: 'running' | 'stopped' | 'restarting' | 'unknown'
  lastPid?: number
  lastChecked?: number
  restartCount: number
  lastMessage?: string
}

// ===== 防火墙 =====

export type FirewallBackend = 'ufw' | 'firewalld' | 'iptables' | 'unknown'

export interface FirewallRule {
  id: string
  number?: number
  action: string
  direction?: string
  protocol?: string
  port?: string
  from?: string
  to?: string
  raw: string
}

export interface FirewallStatus {
  success: boolean
  backend: FirewallBackend
  active: boolean
  rules: FirewallRule[]
  message?: string
  raw?: string
}

// ===== 端口转发 =====

export type PortForwardType = 'local' | 'remote'

export interface PortForwardRule {
  id: string
  connectionId: string
  type: PortForwardType
  name: string
  /** 本地监听地址 */
  localHost: string
  localPort: number
  /** 远端目标地址 */
  remoteHost: string
  remotePort: number
  active: boolean
  message?: string
}

// ===== 主题类型 =====

export interface TerminalThemeColors {
  background: string
  foreground: string
  cursor: string
  cursorAccent: string
  selectionBackground: string
  selectionForeground?: string
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
  brightBlack: string
  brightRed: string
  brightGreen: string
  brightYellow: string
  brightBlue: string
  brightMagenta: string
  brightCyan: string
  brightWhite: string
}

export interface TerminalThemeUI {
  fontFamily: string
  fontSize: number
  lineHeight: number
  cursorBlink: boolean
  cursorStyle: 'block' | 'underline' | 'bar'
}

export type TerminalThemeFontEffect = 'normal' | 'bold' | 'shadow' | 'bold-shadow'

export interface TerminalThemeAppBackground {
  enabled?: boolean
  imagePath?: string
  imageDataUrl?: string
  opacity?: number
  fontColor?: string
  fontEffect?: TerminalThemeFontEffect
}

export interface TerminalTheme {
  id: string
  name: string
  isBuiltIn: boolean
  colors: TerminalThemeColors
  ui: TerminalThemeUI
  appBackground?: TerminalThemeAppBackground
}

// ===== 凭证类型 =====

export interface SSHCredential {
  password?: string
  passphrase?: string
}

// ===== 远程目录树类型 =====

export type RemoteFileType = 'file' | 'directory' | 'symlink' | 'unknown'

export interface RemoteFileEntry {
  name: string
  path: string
  type: RemoteFileType
  size: number
  mode: number
  owner: string
  group: string
  mtime: number
  linkTarget?: string
}

export interface RemoteDirectoryResult {
  success: boolean
  path: string
  entries: RemoteFileEntry[]
  message?: string
}

// ===== 文件传输类型 =====

export interface FileTransferOptions {
  overwrite?: boolean
}

export interface FileTransferResult {
  success: boolean
  message?: string
  code?: 'EEXIST' | 'EACCES' | 'ECONN' | 'UNKNOWN'
}

export interface FileTransferJob {
  id: string
  type: 'upload' | 'download'
  sourcePath: string
  targetPath: string
  status: 'pending' | 'running' | 'success' | 'error'
  message?: string
  createdAt: number
  updatedAt: number
}

export interface SelectFilesResult {
  canceled: boolean
  filePaths: string[]
}

export interface SelectDirectoryResult {
  canceled: boolean
  filePath: string | null
}
