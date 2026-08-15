# ADR 0004: Multi-device pairing, call signaling forking, and transparent privacy gatekeeping

- **Status:** Accepted
- **Date:** 2026-08-15

## Context

Users accessing Open-Slack from multiple personal devices (e.g. primary laptop and mobile phone) required a seamless mechanism to pair secondary devices without re-typing keys, receiving incoming call notifications across all registered devices simultaneously, and transferring active calls without dropping peer connections. Simultaneously, workspace invitations required clear UX separation from personal device pairing to avoid accidental identity leakage.

## Decision

1. **Sub-Identity & Pairing Serialization:**
   - Account identity is anchored by a master ECDSA/ECDH keypair. Secondary devices register hierarchical sub-identities (`DeviceSubIdentity` with `deviceId`, `deviceName`, and local keypair).
   - Zero-prompt device synchronization uses `#device-sync=` payloads containing serialized identity, keys, and workspace metadata, exposed via high-density QR code and direct link under **Preferences > Linked Devices**.
2. **Call Offer Forking & First-Answerer Resolution:**
   - Incoming call offers (`CALL_OFFER`) are broadcast across all active sub-identities of a user, initiating simultaneous ringing.
   - When any device answers, a `CALL_RESOLVED` event (`status: ANSWERED_ELSEWHERE`) is dispatched across the mesh, immediately silencing ringtones on sibling devices and rendering an inline answered-elsewhere status banner.
   - Call transfer (`CALL_TRANSFER`) permits seamless session handoff between active devices.
3. **UX Separation & Privacy Gatekeeping:**
   - **Workspace Invitations** ("Invite Teammates") are strictly scoped to onboarding new members into the workspace under their own identity.
   - **Personal Device Sync** ("Linked Devices") is strictly isolated to account restoration across personal hardware.
   - **Transparent Privacy Copy:** Headers, welcome cards, and settings tabs explicitly declare privacy subtexts (`Public to Workspace`, `Private Channel (N Members)`, `Private Conversation`, and Zero Central Storage architecture statement).

## Consequences

- Full multi-device identity synchronization with simultaneous call ringing and handoff.
- Elimination of user confusion between teammate invites and device pairing.
- Verifiable, transparent privacy and security posture without server or cloud dependencies.
