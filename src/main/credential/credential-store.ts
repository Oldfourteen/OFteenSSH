import { SSHCredential } from '../../shared/types'
import { safeStorageAdapter } from './safe-storage-adapter'
import { encrypt, decrypt, deriveKey } from './crypto-utils'

/**
 * 凭证安全存储
 *
 * 策略：优先使用 Electron safeStorage，不可用时使用 AES-256-GCM 加密后存储
 * 绝不存储明文密码
 */
class CredentialStore {
  private encryptionKey: Buffer | null = null
  /** 标记是否使用 safeStorage 方式存储（在保存时确定，读取时需一致） */
  private useSafeStorage = true

  private getKey(): Buffer {
    if (!this.encryptionKey) {
      this.encryptionKey = deriveKey('ofteen-ssh-master-key')
    }
    return this.encryptionKey
  }

  /** 保存凭证 */
  async saveCredential(id: string, credential: SSHCredential): Promise<void> {
    try {
      this.useSafeStorage = safeStorageAdapter.isAvailable

      if (this.useSafeStorage) {
        // 使用 safeStorage 加密后存储
        if (credential.password) {
          safeStorageAdapter.set(`pwd_${id}`, credential.password)
        }
        if (credential.passphrase) {
          safeStorageAdapter.set(`pp_${id}`, credential.passphrase)
        }
      } else {
        // 备选：AES-256-GCM 加密后存储到 electron-store
        const key = this.getKey()
        if (credential.password) {
          const encrypted = encrypt(credential.password, key)
          safeStorageAdapter.set(`pwd_${id}`, encrypted)
        }
        if (credential.passphrase) {
          const encrypted = encrypt(credential.passphrase, key)
          safeStorageAdapter.set(`pp_${id}`, encrypted)
        }
      }

      // 标记此 ID 的存储方式
      safeStorageAdapter.set(`method_${id}`, this.useSafeStorage ? 'ss' : 'aes')
    } catch (err) {
      throw new Error(`凭证保存失败: ${(err as Error).message}`)
    }
  }

  /** 获取凭证 */
  async getCredential(id: string): Promise<SSHCredential | null> {
    const result: SSHCredential = {}

    // 检查存储方式
    const method = safeStorageAdapter.get(`method_${id}`)
    const usedSafeStorage = method === 'ss'

    // 获取密码
    const rawPassword = safeStorageAdapter.get(`pwd_${id}`)
    if (rawPassword) {
      if (usedSafeStorage) {
        // safeStorage 解密后直接是明文
        result.password = rawPassword
      } else {
        // AES 加密的，需要解密
        try {
          result.password = decrypt(rawPassword, this.getKey())
        } catch {
          // 解密失败
        }
      }
    }

    // 获取 passphrase
    const rawPassphrase = safeStorageAdapter.get(`pp_${id}`)
    if (rawPassphrase) {
      if (usedSafeStorage) {
        result.passphrase = rawPassphrase
      } else {
        try {
          result.passphrase = decrypt(rawPassphrase, this.getKey())
        } catch {
          // 解密失败
        }
      }
    }

    return Object.keys(result).length > 0 ? result : null
  }

  /** 删除凭证 */
  async deleteCredential(id: string): Promise<void> {
    safeStorageAdapter.delete(`pwd_${id}`)
    safeStorageAdapter.delete(`pp_${id}`)
    safeStorageAdapter.delete(`method_${id}`)
  }

  /** 列出所有凭证 ID */
  async listCredentialIds(): Promise<string[]> {
    const keys = safeStorageAdapter.keys()
    const ids = new Set<string>()
    for (const key of keys) {
      if (key.startsWith('pwd_')) {
        ids.add(key.substring(4))
      }
    }
    return [...ids]
  }
}

export const credentialStore = new CredentialStore()
