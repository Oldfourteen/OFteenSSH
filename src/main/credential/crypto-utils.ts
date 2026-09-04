import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

/**
 * AES-256-GCM 加密
 */
export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const tag = cipher.getAuthTag()

  // 格式: iv:tag:encryptedData
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
}

/**
 * AES-256-GCM 解密
 */
export function decrypt(encryptedData: string, key: Buffer): string {
  const parts = encryptedData.split(':')
  if (parts.length !== 3) {
    throw new Error('无效的加密数据格式')
  }

  const iv = Buffer.from(parts[0], 'hex')
  const tag = Buffer.from(parts[1], 'hex')
  const encrypted = parts[2]

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * 从密码派生加密密钥
 */
export function deriveKey(secret: string): Buffer {
  const crypto = require('crypto')
  return crypto.scryptSync(secret, 'ofteen-ssh-salt-v1', 32)
}
