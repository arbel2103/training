// Encrypts a secret for the GitHub Actions Secrets API using libsodium's
// sealed-box (crypto_box_seal) construction, which GitHub requires. tweetnacl
// + tweetnacl-sealedbox-js implement exactly that in ~10KB, no wasm.
import sealedbox from 'tweetnacl-sealedbox-js'

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

/**
 * Seal `value` for the repo's Actions public key.
 * @param publicKeyB64 base64 public key from GET /actions/secrets/public-key
 * @returns base64 ciphertext to PUT as `encrypted_value`
 */
export function sealSecret(publicKeyB64: string, value: string): string {
  const publicKey = base64ToBytes(publicKeyB64)
  const message = new TextEncoder().encode(value)
  const sealed = sealedbox.seal(message, publicKey)
  return bytesToBase64(sealed)
}
