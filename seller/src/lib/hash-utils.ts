// Deterministic XOR-based obfuscation with base62 encoding.
// Works in both server (Node.js) and client (browser) environments.

const SALT = 0x5EEDC0DE; // Arbitrary 32-bit integer salt
const CHARSET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = CHARSET.length;

export function encodeId(id: string | number | undefined | null): string {
  if (id == null) return '';
  const num = parseInt(String(id), 10);
  if (isNaN(num)) {
    // String/UUID fallback obfuscation
    try {
      return btoa(String(id)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch {
      return String(id);
    }
  }
  
  // XOR the number with our salt
  let xored = (num ^ SALT) >>> 0;
  
  let result = '';
  while (xored > 0) {
    result = CHARSET[xored % BASE] + result;
    xored = Math.floor(xored / BASE);
  }
  return result || '0';
}

export function decodeId(hash: string | undefined | null): string {
  if (!hash) return '';
  
  // Decrypt base64-like strings if they are longer than base62 encoded integers
  if (hash.length > 10) {
    try {
      let padded = hash.replace(/-/g, '+').replace(/_/g, '/');
      while (padded.length % 4) padded += '=';
      return atob(padded);
    } catch {
      // Fallback
    }
  }

  let num = 0;
  for (let i = 0; i < hash.length; i++) {
    const char = hash[i];
    const index = CHARSET.indexOf(char);
    if (index === -1) return '';
    num = num * BASE + index;
  }
  
  const decrypted = (num ^ SALT) >>> 0;
  return String(decrypted);
}
