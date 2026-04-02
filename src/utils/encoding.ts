// UTF-8-safe base64 helpers
// atob/btoa operate on Latin-1 bytes only. Characters like — (U+2014) are
// 3 bytes in UTF-8 and get corrupted by a plain atob → string assignment.

export function b64decode(b64: string): string {
  const binary = atob(b64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

export function b64encode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach(b => (binary += String.fromCharCode(b)))
  return btoa(binary)
}
