import { describe, expect, it } from 'vitest';
import {
  bufferToHex,
  decryptAESGCM,
  deriveECDHSharedSecret,
  deriveKeyFromPassphrase,
  encryptAESGCM,
  generateAvatarSvg,
  generateCryptoKeypairs,
  generateWorkspacePassphrase,
  getDeterministicColor,
  getOrCreateIdentity,
  hexToBuffer,
  saveIdentity,
  sha256,
  signMessage,
  verifySignature,
} from '../lib/crypto';

describe('Crypto Module', () => {
  it('converts buffer to hex and back accurately', () => {
    const raw = new Uint8Array([0, 15, 255, 128, 42]);
    const hex = bufferToHex(raw.buffer);
    expect(hex).toBe('000fff802a');
    const back = hexToBuffer(hex);
    expect(Array.from(back)).toEqual([0, 15, 255, 128, 42]);
  });

  it('computes consistent SHA-256 hashes', async () => {
    const hash1 = await sha256('hello quiet slack');
    const hash2 = await sha256('hello quiet slack');
    const hash3 = await sha256('different text');

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it('generates deterministic avatar colors and valid SVGs', () => {
    const colorA = getDeterministicColor('pubkey_alpha');
    const colorA2 = getDeterministicColor('pubkey_alpha');
    const colorB = getDeterministicColor('pubkey_beta');

    expect(colorA).toBe(colorA2);
    expect(typeof colorA).toBe('string');
    expect(colorA.startsWith('#')).toBe(true);

    const svg = generateAvatarSvg('Sarah Connor', '#E01E5A');
    expect(svg.startsWith('data:image/svg+xml;utf8,')).toBe(true);
    expect(svg).toContain('SC');
  });

  it('generates cryptographic keypairs with signing and encryption keys', async () => {
    const { identity, keys } = await generateCryptoKeypairs();

    expect(identity.pubkey).toHaveLength(32);
    expect(identity.enc_pubkey).toHaveLength(32);
    expect(identity.displayName).toBeTruthy();
    expect(identity.handle.startsWith('@')).toBe(true);

    expect(keys.signPublicKey).toContain('P-256');
    expect(keys.signPrivateKey).toContain('P-256');
    expect(keys.encPublicKey).toContain('P-256');
    expect(keys.encPrivateKey).toContain('P-256');
  });

  it('saves and restores user identity from localStorage', async () => {
    const { identity, keys } = await getOrCreateIdentity();
    expect(identity).toBeDefined();

    const identityAgain = await getOrCreateIdentity();
    expect(identityAgain.identity.pubkey).toBe(identity.pubkey);

    const custom = { ...identity, displayName: 'Custom User' };
    saveIdentity(custom, keys);
    const updated = await getOrCreateIdentity();
    expect(updated.identity.displayName).toBe('Custom User');
  });

  it('signs messages with ECDSA private key and verifies valid and invalid signatures', async () => {
    const { keys } = await generateCryptoKeypairs();
    const message = 'Test critical message payload 12345';

    const signature = await signMessage(message, keys.signPrivateKey);
    expect(signature).toBeTruthy();

    // Verify valid signature
    const isValid = await verifySignature(message, signature, keys.signPublicKey);
    expect(isValid).toBe(true);

    // Tampered message
    const isTamperedValid = await verifySignature(message + ' tampered', signature, keys.signPublicKey);
    expect(isTamperedValid).toBe(false);

    // Another keypair verification
    const other = await generateCryptoKeypairs();
    const isOtherKeyValid = await verifySignature(message, signature, other.keys.signPublicKey);
    expect(isOtherKeyValid).toBe(false);
  });

  it('encrypts and decrypts messages with AES-GCM 256-bit derived from passphrase', async () => {
    const passphrase = 'super-secret-workspace-key';
    const { key } = await deriveKeyFromPassphrase(passphrase);

    const secretText = 'P2P Decentralized Private Payload';
    const { cipherTextHex, ivHex } = await encryptAESGCM(secretText, key);

    expect(cipherTextHex).toBeTruthy();
    expect(ivHex).toHaveLength(24); // 12 bytes = 24 hex chars

    const decrypted = await decryptAESGCM(cipherTextHex, ivHex, key);
    expect(decrypted).toBe(secretText);
  });

  it('derives ECDH shared secret between two distinct keypairs', async () => {
    const alice = await generateCryptoKeypairs();
    const bob = await generateCryptoKeypairs();

    // Alice derives shared secret using Bob's public key
    const aliceSecretKey = await deriveECDHSharedSecret(alice.keys.encPrivateKey, bob.keys.encPublicKey);
    // Bob derives shared secret using Alice's public key
    const bobSecretKey = await deriveECDHSharedSecret(bob.keys.encPrivateKey, alice.keys.encPublicKey);

    // Alice encrypts for Bob
    const plainText = 'Direct Message E2EE Payload';
    const { cipherTextHex, ivHex } = await encryptAESGCM(plainText, aliceSecretKey);

    // Bob decrypts with his derived secret
    const decrypted = await decryptAESGCM(cipherTextHex, ivHex, bobSecretKey);
    expect(decrypted).toBe(plainText);
  });

  it('generates random workspace passphrases', () => {
    const pass1 = generateWorkspacePassphrase();
    const pass2 = generateWorkspacePassphrase();

    expect(pass1).toBeTruthy();
    expect(pass1).toContain('-');
    expect(pass1).not.toBe(pass2);
  });
});
