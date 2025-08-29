import CryptoJS from 'crypto-js';

// DES-ECB + PKCS5 (equivale a PKCS7 en CryptoJS)
export function desEcbBase64(plain: string, key8: string): string {
  if (key8.length !== 8) throw new Error('AG_DES_KEY debe tener 8 bytes');
  const key = CryptoJS.enc.Utf8.parse(key8); // 8 bytes
  const data = CryptoJS.enc.Utf8.parse(plain);
  const encrypted = CryptoJS.DES.encrypt(data, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  // CryptoJS ya devuelve Base64, pero para asegurar:
  return CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
}

export function md5Lower(input: string): string {
  return CryptoJS.MD5(input).toString(CryptoJS.enc.Hex); // hex lowercase
}

// Une key=value con separador /\/ (tres caracteres: '/', '\', '/')
export function buildParamsKV(pairs: Record<string, string>) {
  const sep = '/\\/';
  return Object.entries(pairs)
    .map(([k, v]) => `${k}=${v}`)
    .join(sep);
}
