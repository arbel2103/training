import { describe, expect, it } from 'vitest'
import { base64ToBlob, blobToBase64 } from '../fileStore'

describe('base64 <-> Blob round trip (backup file encoding)', () => {
  it('preserves bytes exactly', async () => {
    const bytes = new Uint8Array([0, 1, 2, 254, 255, 128, 42])
    const blob = new Blob([bytes], { type: 'image/png' })

    const b64 = await blobToBase64(blob)
    const back = base64ToBlob(b64, 'image/png')

    expect(back.type).toBe('image/png')
    expect(new Uint8Array(await back.arrayBuffer())).toEqual(bytes)
  })

  it('handles an empty file', async () => {
    const b64 = await blobToBase64(new Blob([]))
    expect(b64).toBe('')
    expect(base64ToBlob(b64).size).toBe(0)
  })

  it('survives a payload larger than one fromCharCode chunk', async () => {
    // 100k bytes crosses the 0x8000 chunk boundary the encoder uses
    const bytes = new Uint8Array(100_000)
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256
    const back = base64ToBlob(await blobToBase64(new Blob([bytes])))
    expect(new Uint8Array(await back.arrayBuffer())).toEqual(bytes)
  })
})
