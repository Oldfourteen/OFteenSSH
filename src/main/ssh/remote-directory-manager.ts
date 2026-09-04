import { sshConnectionManager } from './connection-manager'
import { RemoteDirectoryResult, FileTransferOptions, FileTransferResult } from '../../shared/types'

class RemoteDirectoryManager {
  /** 列出指定连接的远程目录内容 */
  async list(connectionId: string, path: string): Promise<RemoteDirectoryResult> {
    const connection = sshConnectionManager.getConnection(connectionId)
    if (!connection) {
      return {
        success: false,
        path,
        entries: [],
        message: '连接不存在'
      }
    }

    if (!connection.isConnected) {
      return {
        success: false,
        path,
        entries: [],
        message: 'SSH 未连接'
      }
    }

    return connection.listDirectory(path || '~')
  }

  /** 上传本地文件到远程 */
  async upload(
    connectionId: string,
    localPath: string,
    remotePath: string,
    options?: FileTransferOptions
  ): Promise<FileTransferResult> {
    const connection = sshConnectionManager.getConnection(connectionId)
    if (!connection) {
      return { success: false, message: '连接不存在' }
    }
    if (!connection.isConnected) {
      return { success: false, message: 'SSH 未连接', code: 'ECONN' }
    }
    return connection.uploadFile(localPath, remotePath, options)
  }

  /** 下载远程文件到本地 */
  async download(
    connectionId: string,
    remotePath: string,
    localPath: string,
    options?: FileTransferOptions
  ): Promise<FileTransferResult> {
    const connection = sshConnectionManager.getConnection(connectionId)
    if (!connection) {
      return { success: false, message: '连接不存在' }
    }
    if (!connection.isConnected) {
      return { success: false, message: 'SSH 未连接', code: 'ECONN' }
    }
    return connection.downloadFile(remotePath, localPath, options)
  }
}

export const remoteDirectoryManager = new RemoteDirectoryManager()
