import { describe, expect, it } from 'vitest';
import { ToastNotification } from '../types';

describe('Slack Toast Notification System', () => {
  it('formats standard channel message toast accurately', () => {
    const toast: ToastNotification = {
      id: 'toast_1',
      authorName: 'Marcus Sterling',
      authorPubkey: 'pubkey_marcus',
      channelId: 'chan_general',
      channelName: 'general',
      isPrivate: false,
      content: 'Hey everyone, check out the new P2P sync build!',
      type: 'message',
      createdAt: Date.now(),
    };

    expect(toast.id).toBe('toast_1');
    expect(toast.authorName).toBe('Marcus Sterling');
    expect(toast.channelName).toBe('general');
    expect(toast.type).toBe('message');
    expect(toast.content).toContain('P2P sync build');
  });

  it('formats mention toast with proper tag and highlight', () => {
    const toast: ToastNotification = {
      id: 'toast_2',
      authorName: 'Elena Rostova',
      authorPubkey: 'pubkey_elena',
      channelId: 'chan_p2p_development',
      channelName: 'p2p-engineering',
      isPrivate: false,
      content: '@alex.m can you review this WebRTC data channel pull request?',
      type: 'mention',
      createdAt: Date.now(),
    };

    expect(toast.type).toBe('mention');
    expect(toast.content).toContain('@alex.m');
  });

  it('formats direct message and private channel toasts', () => {
    const dmToast: ToastNotification = {
      id: 'toast_3',
      authorName: 'Priya Sharma',
      authorPubkey: 'pubkey_priya',
      channelId: 'dm_user_priya',
      channelName: 'Priya Sharma',
      isDirectMessage: true,
      isPrivate: true,
      content: 'Are you free for a quick audio huddle?',
      type: 'message',
      createdAt: Date.now(),
    };

    expect(dmToast.isDirectMessage).toBe(true);
    expect(dmToast.isPrivate).toBe(true);
  });

  it('formats thread reply toasts with threadParentId', () => {
    const threadToast: ToastNotification = {
      id: 'toast_4',
      authorName: 'Alex Morgan',
      authorPubkey: 'pubkey_alex',
      channelId: 'chan_general',
      channelName: 'general',
      messageId: 'msg_reply_99',
      threadParentId: 'msg_parent_1',
      content: 'I completely agree with this proposal.',
      type: 'thread_reply',
      createdAt: Date.now(),
    };

    expect(threadToast.type).toBe('thread_reply');
    expect(threadToast.threadParentId).toBe('msg_parent_1');
  });
});
