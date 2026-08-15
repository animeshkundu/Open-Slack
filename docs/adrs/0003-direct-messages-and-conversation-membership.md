# ADR 0003: Direct message organization and channel membership boundaries

- **Status:** Accepted
- **Date:** 2026-08-15

## Context

Previously, the sidebar Direct Messages list rendered both active DM/Group DM conversations and an arbitrary list of all discovered teammates who did not have an open chat. This led to user confusion regarding which items were active channels vs. triggers for the DM modal. In addition, when leaving a group DM or private channel, the member count and channel details in the sidebar and info drawer could fall out of sync with actual membership.

## Decision

1. **Sidebar DM Discipline:** The "Direct Messages" section in `PrimarySidebar` exclusively lists active 1-on-1 and Group Direct Messages. Uncontacted teammates are discovered and selected inside the dedicated "New Direct Message / Group Chat" modal or invite flow.
2. **Channel-Scoped Membership:** Channel information panes (`RightDrawer`), member counts, and avatar stacks (`MainHeader`) strictly derive participants from `activeChannel.members` rather than the workspace-wide peer list.
3. **Explicit Conversation Lifecycle:** Users can leave or close any direct message, group chat, or private channel using the in-sidebar quick action (`leave-dm-btn-*`) or the channel details drawer (`leave-conversation-drawer-btn`), cleanly updating the CRDT membership array and falling back to `#general`.

## Consequences

- Direct messages list matches Slack's layout and mental model.
- Group DM member lists accurately reflect active participants.
- Clean separation between active conversations and directory lookup.
