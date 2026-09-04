import { Client, ClientChannel, ConnectConfig, SFTPWrapper } from 'ssh2'
import { EventEmitter } from 'events'
import { SSHConnectionConfig, ConnectionStatus, SSHCredential, RemoteFileEntry, RemoteDirectoryResult, RemoteFileType, FileTransferOptions, FileTransferResult } from '../../shared/types'
import { readFileSync, existsSync, accessSync } from 'fs'
import { posix as pathPosix, normalize as normalizeLocalPath } from 'path'
import { expandHomeDir } from './utils'

export class SSHConnection extends EventEmitter {
  private client: Client | null = null
  private _status: ConnectionStatus = 'idle'
  private config: SSHConnectionConfig
  private credential: SSHCredential | null = null
  private sftpWrapper: SFTPWrapper | null = null
  private homeDirectory: string | null = null

  constructor(config: SSHConnectionConfig) {
    super()
    this.config = config
  }

  get id(): string {
    return this.config.id
  }

  get status(): ConnectionStatus {
    return this._status
  }

  get isConnected(): boolean {
    return this._status === 'connected'
  }

  get sshClient(): Client | null {
    return this.client
  }

  /** 设置凭证 */
  setCredential(cred: SSHCredential): void {
    this.credential = cred
  }

  /** 建立 SSH 连接 */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected && this.client) {
        resolve()
        return
      }

      this._status = 'connecting'
      this.emit('status-changed', this._status)

      this.client = new Client()

      const connectConfig: ConnectConfig = {
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        readyTimeout: 20000,
        keepaliveInterval: 10000,
        keepaliveCountMax: 3,
        // 不严格验证主机密钥，允许首次连接
        hostVerifier: () => true
      }

      // 设置认证方式
      if (this.config.authType === 'privatekey' && this.config.privateKeyPath) {
        try {
          // 展开 ~ 路径
          const keyPath = expandHomeDir(this.config.privateKeyPath)
          if (!existsSync(keyPath)) {
            this._status = 'failed'
            this.emit('status-changed', this._status)
            reject(new Error(`密钥文件不存在: ${keyPath}`))
            return
          }
          connectConfig.privateKey = readFileSync(keyPath)
          if (this.credential?.passphrase) {
            connectConfig.passphrase = this.credential.passphrase
          }
        } catch (err) {
          this._status = 'failed'
          this.emit('status-changed', this._status)
          reject(new Error(`无法读取密钥文件: ${(err as Error).message}`))
          return
        }
      } else if (this.credential?.password) {
        connectConfig.password = this.credential.password
      } else if (this.config.authType === 'password') {
        this._status = 'failed'
        this.emit('status-changed', this._status)
        reject(new Error('未设置密码，请先保存密码凭证'))
        return
      }

      this.client.on('ready', () => {
        this._status = 'connected'
        this.emit('status-changed', this._status)
        this.emit('connected')
        resolve()
      })

      this.client.on('error', (err) => {
        if (this._status === 'connecting') {
          this._status = 'failed'
          this.emit('status-changed', this._status)
          reject(err)
        } else {
          this.emit('error', err)
        }
      })

      this.client.on('close', () => {
        const wasConnected = this._status === 'connected'
        this._status = 'disconnected'
        this.emit('status-changed', this._status)
        if (wasConnected) {
          this.emit('unexpected-close')
        }
      })

      this.client.on('end', () => {
        if (this._status !== 'disconnected') {
          this._status = 'disconnected'
          this.emit('status-changed', this._status)
        }
      })

      this.client.connect(connectConfig)
    })
  }

  /** 断开连接 */
  disconnect(): void {
    if (this.sftpWrapper) {
      try {
        this.sftpWrapper.end()
      } catch {
        // 忽略 SFTP 关闭错误
      }
      this.sftpWrapper = null
    }
    if (this.client) {
      try {
        this.client.end()
      } catch {
        // 忽略断开时的错误
      }
      this.client = null
    }
    this.homeDirectory = null
    this._status = 'disconnected'
    this.emit('status-changed', this._status)
  }

  /** 获取交互式 Shell */
  shell(options?: { cols?: number; rows?: number }): Promise<ClientChannel> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        reject(new Error('SSH 未连接'))
        return
      }

      this.client.shell(
        {
          cols: options?.cols || 80,
          rows: options?.rows || 24,
          term: 'xterm-256color'
        },
        (err, stream) => {
          if (err) {
            reject(err)
            return
          }
          resolve(stream)
        }
      )
    })
  }

  /** 执行命令并返回输出 */
  exec(command: string, timeout: number = 10000): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        reject(new Error('SSH 未连接'))
        return
      }

      const timer = setTimeout(() => {
        reject(new Error(`命令执行超时: ${command}`))
      }, timeout)

      this.client.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timer)
          reject(err)
          return
        }

        let output = ''
        stream.on('data', (data: Buffer) => {
          output += data.toString()
        })
        stream.stderr.on('data', (data: Buffer) => {
          output += data.toString()
        })
        stream.on('close', () => {
          clearTimeout(timer)
          resolve(output)
        })
      })
    })
  }

  /** 获取 SFTP 会话（带缓存） */
  sftp(): Promise<SFTPWrapper> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        reject(new Error('SSH 未连接'))
        return
      }
      if (this.sftpWrapper) {
        resolve(this.sftpWrapper)
        return
      }
      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err)
          return
        }
        this.sftpWrapper = sftp
        resolve(sftp)
      })
    })
  }

  /** 解析用户主目录 */
  async resolveHome(): Promise<string> {
    if (this.homeDirectory) return this.homeDirectory
    try {
      const home = await this.exec('echo $HOME', 5000)
      this.homeDirectory = home.trim() || '/'
      return this.homeDirectory
    } catch {
      this.homeDirectory = '/'
      return this.homeDirectory
    }
  }

  /** 读取远程目录 */
  async listDirectory(rawPath: string): Promise<RemoteDirectoryResult> {
    if (!this.client || !this.isConnected) {
      return { success: false, path: rawPath, entries: [], message: 'SSH 未连接' }
    }

    let targetPath = rawPath
    if (targetPath === '~' || targetPath.startsWith('~/')) {
      const home = await this.resolveHome()
      targetPath = targetPath.replace(/^~/, home)
    }
    targetPath = pathPosix.normalize(targetPath)

    try {
      const sftp = await this.sftp()
      const entries = await this.readdirWithTimeout(sftp, targetPath, 15000)
      const result: RemoteFileEntry[] = entries.map((entry) => {
        const fullPath = pathPosix.join(targetPath, entry.filename)
        const stats = entry.attrs
        let type: RemoteFileType = 'unknown'
        if (stats.isDirectory()) type = 'directory'
        else if (stats.isFile()) type = 'file'
        else if (stats.isSymbolicLink()) type = 'symlink'

        return {
          name: entry.filename,
          path: fullPath,
          type,
          size: stats.size || 0,
          mode: stats.mode || 0,
          owner: String(stats.uid ?? '-'),
          group: String(stats.gid ?? '-'),
          mtime: stats.mtime ? Math.floor(stats.mtime / 1000) : 0
        }
      })

      // 目录在前，文件在后，按名称排序
      result.sort((a, b) => {
        if (a.type === 'directory' && b.type !== 'directory') return -1
        if (a.type !== 'directory' && b.type === 'directory') return 1
        return a.name.localeCompare(b.name)
      })

      return { success: true, path: targetPath, entries: result }
    } catch (err) {
      return {
        success: false,
        path: targetPath,
        entries: [],
        message: `读取目录失败: ${(err as Error).message}`
      }
    }
  }

  private readdirWithTimeout(sftp: SFTPWrapper, path: string, timeoutMs: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('读取目录超时'))
      }, timeoutMs)
      sftp.readdir(path, (err, list) => {
        clearTimeout(timer)
        if (err) {
          reject(err)
          return
        }
        resolve(list)
      })
    })
  }

  /** 上传本地文件到远程 */
  async uploadFile(
    localPath: string,
    remotePath: string,
    options: FileTransferOptions = {}
  ): Promise<FileTransferResult> {
    if (!this.client || !this.isConnected) {
      return { success: false, message: 'SSH 未连接', code: 'ECONN' }
    }

    const normalizedLocal = normalizeLocalPath(localPath)
    try {
      accessSync(normalizedLocal)
    } catch {
      return { success: false, message: `本地文件不存在: ${normalizedLocal}` }
    }

    let targetPath = remotePath
    if (targetPath === '~' || targetPath.startsWith('~/')) {
      const home = await this.resolveHome()
      targetPath = targetPath.replace(/^~/, home)
    }
    targetPath = pathPosix.normalize(targetPath)

    try {
      const sftp = await this.sftp()

      if (!options.overwrite) {
        const exists = await this.statPath(sftp, targetPath)
        if (exists) {
          return { success: false, message: '远程文件已存在', code: 'EEXIST' }
        }
      }

      await this.fastPutWithTimeout(sftp, normalizedLocal, targetPath, 0)
      return { success: true }
    } catch (err) {
      const msg = (err as Error).message || String(err)
      const code = msg.toLowerCase().includes('permission') ? 'EACCES' : 'UNKNOWN'
      return { success: false, message: `上传失败: ${msg}`, code }
    }
  }

  /** 下载远程文件到本地 */
  async downloadFile(
    remotePath: string,
    localPath: string,
    options: FileTransferOptions = {}
  ): Promise<FileTransferResult> {
    if (!this.client || !this.isConnected) {
      return { success: false, message: 'SSH 未连接', code: 'ECONN' }
    }

    let targetRemote = remotePath
    if (targetRemote === '~' || targetRemote.startsWith('~/')) {
      const home = await this.resolveHome()
      targetRemote = targetRemote.replace(/^~/, home)
    }
    targetRemote = pathPosix.normalize(targetRemote)

    const normalizedLocal = normalizeLocalPath(localPath)

    try {
      const sftp = await this.sftp()

      if (!options.overwrite) {
        try {
          accessSync(normalizedLocal)
          return { success: false, message: '本地文件已存在', code: 'EEXIST' }
        } catch {
          // 不存在，继续
        }
      }

      await this.fastGetWithTimeout(sftp, targetRemote, normalizedLocal, 0)
      return { success: true }
    } catch (err) {
      const msg = (err as Error).message || String(err)
      const code = msg.toLowerCase().includes('permission') ? 'EACCES' : 'UNKNOWN'
      return { success: false, message: `下载失败: ${msg}`, code }
    }
  }

  private statPath(sftp: SFTPWrapper, path: string): Promise<boolean> {
    return new Promise((resolve) => {
      sftp.stat(path, (err) => resolve(!err))
    })
  }

  private fastPutWithTimeout(
    sftp: SFTPWrapper,
    localPath: string,
    remotePath: string,
    timeoutMs: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let timer: NodeJS.Timeout | null = null
      if (timeoutMs > 0) {
        timer = setTimeout(() => reject(new Error('上传超时')), timeoutMs)
      }
      sftp.fastPut(localPath, remotePath, (err) => {
        if (timer) clearTimeout(timer)
        if (err) reject(err)
        else resolve()
      })
    })
  }

  private fastGetWithTimeout(
    sftp: SFTPWrapper,
    remotePath: string,
    localPath: string,
    timeoutMs: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let timer: NodeJS.Timeout | null = null
      if (timeoutMs > 0) {
        timer = setTimeout(() => reject(new Error('下载超时')), timeoutMs)
      }
      sftp.fastGet(remotePath, localPath, (err) => {
        if (timer) clearTimeout(timer)
        if (err) reject(err)
        else resolve()
      })
    })
  }

  /** 销毁连接 */
  destroy(): void {
    this.disconnect()
    this.removeAllListeners()
  }
}
