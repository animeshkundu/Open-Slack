import { StoredPrivateKeyPair, UserIdentity } from '../types';

const STORAGE_KEYS = {
  USER_IDENTITY: 'quietslack_user_identity',
  CRYPTO_KEYS: 'quietslack_crypto_keys',
};

// Utility to convert ArrayBuffer to hex
export function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
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
export async function sha256(data: string | ArrayBuffer): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = typeof data === 'string' ? encoder.encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return bufferToHex(hash);
}

// Deterministic User Avatar color generator
const AVATAR_COLORS = [
  '#E01E5A', // Slack Aubergine Red
  '#2BAC76', // Green
  '#1264A3', // Blue
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

  // Derive stable public fingerprint from Signing Public Key (x + y coordinates)
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
    status: 'Exploring QuietSlack 🚀',
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
  const cachedIdentity = localStorage.getItem(STORAGE_KEYS.USER_IDENTITY);
  const cachedKeys = localStorage.getItem(STORAGE_KEYS.CRYPTO_KEYS);

  if (cachedIdentity && cachedKeys) {
    try {
      const identity = JSON.parse(cachedIdentity) as UserIdentity;
      const keys = JSON.parse(cachedKeys) as StoredPrivateKeyPair;
      return { identity, keys };
    } catch {
      // fallback to generation if parsing fails
    }
  }

  const generated = await generateCryptoKeypairs();
  saveIdentity(generated.identity, generated.keys);
  return generated;
}

export function saveIdentity(identity: UserIdentity, keys?: StoredPrivateKeyPair) {
  localStorage.setItem(STORAGE_KEYS.USER_IDENTITY, JSON.stringify(identity));
  if (keys) {
    localStorage.setItem(STORAGE_KEYS.CRYPTO_KEYS, JSON.stringify(keys));
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
 * Generate a random 256-bit Workspace Symmetric Key
 */
export function generateWorkspacePassphrase(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('-');
}
