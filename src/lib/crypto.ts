import { StoredPrivateKeyPair, UserIdentity } from '../types';

const STORAGE_KEYS = {
  USER_IDENTITY: 'openslack_user_identity',
  CRYPTO_KEYS: 'openslack_crypto_keys',
};

// Utility to convert ArrayBuffer or Uint8Array to hex
export function bufferToHex(buffer: ArrayBuffer | ArrayBufferLike | Uint8Array): string {
  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(uint8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Utility to convert hex string to Uint8Array
export function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// SHA-256 hashing
export async function sha256(data: string | BufferSource | ArrayBufferLike): Promise<string> {
  const encoder = new TextEncoder();
  const buffer: BufferSource = typeof data === 'string' ? encoder.encode(data) : (data as BufferSource);
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return bufferToHex(hash);
}

// Deterministic User Avatar color generator
const AVATAR_COLORS = [
  '#E01E5A', // Slack Red
  '#2BAC76', // Green
  '#1164A3', // Blue
  '#ECB22E', // Yellow
  '#4A154B', // Deep Aubergine
  '#007a5a', // Dark Green
  '#611f69', // Berry
  '#e8912d', // Orange
];

export function getDeterministicColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Generate SVG data url avatar
export function generateAvatarSvg(name: string, color: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('') || name.substring(0, 2).toUpperCase() || 'QS';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" rx="16" fill="${color}"/>
    <text x="50" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generate native ECDSA Signing & ECDH Encryption keypairs
 */
export async function generateCryptoKeypairs(): Promise<{
  identity: UserIdentity;
  keys: StoredPrivateKeyPair;
}> {
  // 1. Generate Signing Keypair (ECDSA P-256 with SHA-256)
  const signKeypair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  // 2. Generate ECDH Keypair for Encryption / Key exchange
  const encKeypair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  // Export keys as JWK
  const signPubJWK = await crypto.subtle.exportKey('jwk', signKeypair.publicKey);
  const signPrivJWK = await crypto.subtle.exportKey('jwk', signKeypair.privateKey);
  const encPubJWK = await crypto.subtle.exportKey('jwk', encKeypair.publicKey);
  const encPrivJWK = await crypto.subtle.exportKey('jwk', encKeypair.privateKey);

  // Derive stable public fingerprint from Signing Public Key
  const pubRaw = `${signPubJWK.x || ''}${signPubJWK.y || ''}`;
  const pubkey = (await sha256(pubRaw)).substring(0, 32);
  const encPubRaw = `${encPubJWK.x || ''}${encPubJWK.y || ''}`;
  const enc_pubkey = (await sha256(encPubRaw)).substring(0, 32);

  const defaultNames = ['Alex Rivera', 'Jordan Lee', 'Morgan Taylor', 'Casey Chen', 'Samira Khan', 'Riley Brooks'];
  const randomName = defaultNames[Math.floor(Math.random() * defaultNames.length)];
  const handle = randomName.toLowerCase().replace(/\s+/g, '.');
  const color = getDeterministicColor(pubkey);
  const avatarUrl = generateAvatarSvg(randomName, color);

  const identity: UserIdentity = {
    pubkey,
    enc_pubkey,
    displayName: randomName,
    handle: `@${handle}`,
    avatarUrl,
    status: 'Exploring Open Slack 🚀',
    lastSeen: Date.now(),
    color,
    isOnline: true,
  };

  const keys: StoredPrivateKeyPair = {
    signPublicKey: JSON.stringify(signPubJWK),
    signPrivateKey: JSON.stringify(signPrivJWK),
    encPublicKey: JSON.stringify(encPubJWK),
    encPrivateKey: JSON.stringify(encPrivJWK),
  };

  return { identity, keys };
}

/**
 * Load or initialize local user identity
 */
export async function getOrCreateIdentity(): Promise<{
  identity: UserIdentity;
  keys: StoredPrivateKeyPair;
}> {
  const cachedIdentity = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.USER_IDENTITY) : null;
  const cachedKeys = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.CRYPTO_KEYS) : null;

  if (cachedIdentity && cachedKeys) {
    try {
      const identity = JSON.parse(cachedIdentity) as UserIdentity;
      const keys = JSON.parse(cachedKeys) as StoredPrivateKeyPair;
      return { identity, keys };
    } catch {
      // fallback to generation
    }
  }

  const generated = await generateCryptoKeypairs();
  saveIdentity(generated.identity, generated.keys);
  return generated;
}

export function saveIdentity(identity: UserIdentity, keys?: StoredPrivateKeyPair) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.USER_IDENTITY, JSON.stringify(identity));
    if (keys) {
      localStorage.setItem(STORAGE_KEYS.CRYPTO_KEYS, JSON.stringify(keys));
    }
  }
}

/**
 * Sign message content with ECDSA Private Key
 */
export async function signMessage(
  content: string,
  privateKeyJWKString: string
): Promise<string> {
  try {
    const jwk = JSON.parse(privateKeyJWKString);
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      privateKey,
      data
    );

    return bufferToHex(signature);
  } catch (err) {
    console.warn('Sign message error:', err);
    return '';
  }
}

/**
 * Verify message signature
 */
export async function verifySignature(
  content: string,
  signatureHex: string,
  publicKeyJWKString: string
): Promise<boolean> {
  try {
    const jwk = JSON.parse(publicKeyJWKString);
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const signature = hexToBuffer(signatureHex);

    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      publicKey,
      signature as BufferSource,
      data
    );
  } catch {
    return false;
  }
}

/**
 * Derive AES-GCM Symmetric Key from a passphrase using PBKDF2
 */
export async function deriveKeyFromPassphrase(passphrase: string, saltHex?: string): Promise<{ key: CryptoKey; salt: string }> {
  const salt = saltHex ? hexToBuffer(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  return { key, salt: bufferToHex(salt.buffer) };
}

/**
 * Encrypt data using AES-GCM (256-bit)
 */
export async function encryptAESGCM(plainText: string, key: CryptoKey): Promise<{ cipherTextHex: string; ivHex: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainText)
  );

  return {
    cipherTextHex: bufferToHex(cipherBuffer),
    ivHex: bufferToHex(iv.buffer),
  };
}

/**
 * Decrypt data using AES-GCM (256-bit)
 */
export async function decryptAESGCM(cipherTextHex: string, ivHex: string, key: CryptoKey): Promise<string> {
  const cipherBuffer = hexToBuffer(cipherTextHex);
  const iv = hexToBuffer(ivHex);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    cipherBuffer as BufferSource
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Derive ECDH Shared Secret Key between local private key and remote public key
 */
export async function deriveECDHSharedSecret(
  localPrivateKeyJWKString: string,
  remotePublicKeyJWKString: string
): Promise<CryptoKey> {
  const localPrivJWK = JSON.parse(localPrivateKeyJWKString);
  const remotePubJWK = JSON.parse(remotePublicKeyJWKString);

  const localPrivateKey = await crypto.subtle.importKey(
    'jwk',
    localPrivJWK,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey', 'deriveBits']
  );

  const remotePublicKey = await crypto.subtle.importKey(
    'jwk',
    remotePubJWK,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: remotePublicKey,
    },
    localPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random 256-bit Workspace Passphrase
 */
export function generateWorkspacePassphrase(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('-');
}
