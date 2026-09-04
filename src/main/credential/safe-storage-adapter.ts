import { safeStorage } from 'electron'
import Store from 'electron-store'

interface SafeStoreData {
  [key: string]: string
}

/**
 * Electron safeStorage 适配器
 * 使用 safeStorage 加密后存储到 electron-store
 */
class SafeStorageAdapter {
  private store: Store<SafeStoreData>

  constructor() {
    this.store = new Store<SafeStoreData>({
      name: 'credentials-safe'
    })
  }

  /** 是否可用 */
  get isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable()
  }

  /** 加密存储 */
  set(key: string, value: string): void {
    if (!this.isAvailable) {
      throw new Error('安全存储不可用')
    }
    const encrypted = safeStorage.encryptString(value)
    this.store.set(key, encrypted.toString('base64'))
  }

  /** 解密读取 */
  get(key: string): string | null {
    const encoded = this.store.get(key)
    if (!encoded) return null

    try {
      const buffer = Buffer.from(encoded, 'base64')
      return safeStorage.decryptString(buffer)
    } catch {
      return null
    }
  }

  /** 删除 */
  delete(key: string): void {
    this.store.delete(key)
  }

  /** 列出所有 key */
  keys(): string[] {
    return Object.keys(this.store.store)
  }
}

export const safeStorageAdapter = new SafeStorageAdapter()
