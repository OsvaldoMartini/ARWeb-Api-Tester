import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PREFIX = 'arweb:v1:';
const ALGO   = 'aes-256-gcm';

/**
 * AES-256-GCM encryption for API keys stored at rest.
 *
 * Format: arweb:v1:<base64(iv[12] + authTag[16] + ciphertext)>
 *
 * Plain-text values (legacy / not yet encrypted) pass through decrypt()
 * unchanged so existing databases migrate transparently — they will be
 * re-encrypted the next time the user saves the provider setting.
 */
export class CryptoService {
  private readonly key: Buffer;

  constructor(masterKey: string) {
    // Derive a 32-byte key from the master key string
    this.key = createHash('sha256').update(masterKey, 'utf8').digest();
  }

  encrypt(plaintext: string): string {
    const iv        = randomBytes(12);
    const cipher    = createCipheriv(ALGO, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag   = cipher.getAuthTag();
    return PREFIX + Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(value: string): string {
    if (!this.isEncrypted(value)) return value; // plain-text passthrough (legacy)
    const payload  = Buffer.from(value.slice(PREFIX.length), 'base64');
    const iv       = payload.subarray(0, 12);
    const authTag  = payload.subarray(12, 28);
    const ciphered = payload.subarray(28);
    const decipher = createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphered).toString('utf8') + decipher.final('utf8');
  }

  isEncrypted(value: string): boolean {
    return value.startsWith(PREFIX);
  }
}
