export interface StoredCredential {
  id: string
  encryptedPassword?: string
  encryptedPassphrase?: string
  iv?: string
  tag?: string
}
