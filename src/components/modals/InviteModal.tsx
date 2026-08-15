import confetti from 'canvas-confetti';
import {
  Check,
  Copy,
  Download,
  Eye,
  Globe,
  ImageIcon,
  Key,
  Lock,
  Mail,
  QrCode,
  Send,
  Share2,
  Shield,
  ShieldCheck,
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import React, { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialHuddleChannel?: string | null;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  initialHuddleChannel,
}) => {
  const { activeWorkspace, activeChannel } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'link' | 'social' | 'qr' | 'preview_card' | 'specs'>('link');
  const [recipientName, setRecipientName] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate Invite URL payload with base64 data
  const payloadStr = activeWorkspace ? btoa(JSON.stringify(activeWorkspace)) : '';
  const huddleQuery = initialHuddleChannel ? `&huddle=${encodeURIComponent(initialHuddleChannel)}` : '';
  const inviteUrl = `${window.location.origin}${window.location.pathname}#invite=${payloadStr}${huddleQuery}`;
  const jsonConfig = activeWorkspace ? JSON.stringify(activeWorkspace, null, 2) : '';

  const personalizedText = activeWorkspace
    ? recipientName.trim()
      ? `Hey ${recipientName.trim()}, join our decentralized workspace "${activeWorkspace.name}" on Open-Slack:\n${inviteUrl}`
      : `Join our decentralized, serverless workspace "${activeWorkspace.name}" on Open-Slack:\n${inviteUrl}`
    : '';

  // Generate QR Code on modal open, url change, or tab change
  useEffect(() => {
    if (!isOpen || !activeWorkspace || !inviteUrl) return;

    QRCode.toDataURL(inviteUrl, {
      width: 280,
      margin: 1.5,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => {
        console.warn('QR Code Generation Error (Retrying with Low EC):', err);
        QRCode.toDataURL(inviteUrl, {
          width: 280,
          margin: 1,
          errorCorrectionLevel: 'L',
          color: {
            dark: '#111827',
            light: '#FFFFFF',
          },
        })
          .then((url) => setQrDataUrl(url))
          .catch((retryErr) => console.error('QR Code Fallback Failed:', retryErr));
      });
  }, [isOpen, activeWorkspace, inviteUrl, activeTab]);

  // Render Privacy-Safe Preview Card on Canvas
  useEffect(() => {
    if (activeTab === 'preview_card' && previewCanvasRef.current && activeWorkspace) {
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 600;
      canvas.height = 340;

      // 1. Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 600, 340);
      bgGrad.addColorStop(0, '#1E1035');
      bgGrad.addColorStop(1, '#0D0814');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 600, 340);

      // 2. Subtle grid pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 600; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 340);
        ctx.stroke();
      }
      for (let y = 0; y < 340; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(600, y);
        ctx.stroke();
      }

      // 3. Top Header Bar & Badges
      ctx.fillStyle = '#611f69';
      ctx.beginPath();
      ctx.roundRect(30, 25, 48, 48, 12);
      ctx.fill();

      // Slack hash symbol in logo box
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
      ctx.fillText('#', 47, 57);

      // Title & decentralized badge
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
      ctx.fillText(activeWorkspace.name, 90, 47);

      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
      ctx.fillText('● E2EE P2P MESH VERIFIED', 90, 66);

      // 4. Privacy Shield Banner
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(30, 90, 540, 160, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.stroke();

      // Abstract mock chat UI without leaking messages or PII
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
      ctx.fillText(`Channel: #${activeChannel?.name || 'general'}`, 50, 120);

      // Redacted placeholder message bars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.roundRect(50, 140, 280, 12, 6);
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(50, 160, 420, 12, 6);
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(50, 180, 200, 12, 6);
      ctx.fill();

      // Privacy protection stamp
      ctx.fillStyle = '#34D399';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
      ctx.fillText('🔒 Zero-Knowledge Local Encryption (No Chat Leakage)', 50, 225);

      // 5. Footer Specs
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
      ctx.fillText('WebRTC Data Channels • Nostr Ephemeral Signaling • Yjs CRDT', 30, 310);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
      ctx.fillText('Open-Slack Serverless', 460, 310);
    }
  }, [activeTab, activeWorkspace, activeChannel]);

  if (!isOpen || !activeWorkspace) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonConfig);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${activeWorkspace.name} on Open-Slack`,
          text: personalizedText,
          url: inviteUrl,
        });
      } catch (err) {
        console.warn('Native share cancelled or failed:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${activeWorkspace.name.toLowerCase().replace(/\s+/g, '-')}-invite-qr.png`;
    a.click();
  };

  const handleDownloadPreviewCard = () => {
    if (!previewCanvasRef.current) return;
    const a = document.createElement('a');
    a.href = previewCanvasRef.current.toDataURL('image/png');
    a.download = `${activeWorkspace.name.toLowerCase().replace(/\s+/g, '-')}-privacy-card.png`;
    a.click();
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2000);
  };

  // Social Share URLs
  const encodedText = encodeURIComponent(personalizedText);
  const encodedUrl = encodeURIComponent(inviteUrl);

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
  const telegramUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(`Join ${activeWorkspace.name} on Open-Slack`)}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(`Invitation to join ${activeWorkspace.name} on Open-Slack`)}&body=${encodedText}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;

  return (
    <div
      id="invite-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        id="invite-modal-card"
        className="w-full max-w-xl max-h-[92dvh] sm:max-h-[88vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-neutral-200 overflow-y-auto flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto my-2 sm:hidden flex-shrink-0" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4A154B] text-white flex items-center justify-center font-bold shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-neutral-900 leading-tight">
                Invite Teammates & Start Huddles
              </h3>
              <p className="text-xs text-neutral-500">
                Workspace: <span className="font-bold text-neutral-700">{activeWorkspace.name}</span> • P2P Mesh
              </p>
            </div>
          </div>
          <button
            id="close-invite-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-neutral-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex border-b border-neutral-200 px-4 sm:px-6 gap-2 overflow-x-auto no-scrollbar flex-shrink-0 bg-neutral-50/70">
          <button
            id="invite-tab-link-btn"
            type="button"
            onClick={() => setActiveTab('link')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'link'
                ? 'border-[#007a5a] text-[#007a5a]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Invite Link</span>
          </button>

          <button
            id="invite-tab-social-btn"
            type="button"
            onClick={() => setActiveTab('social')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'social'
                ? 'border-[#007a5a] text-[#007a5a]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Share to Apps</span>
          </button>

          <button
            id="invite-tab-qr-btn"
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'qr'
                ? 'border-[#007a5a] text-[#007a5a]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code</span>
          </button>

          <button
            id="invite-tab-preview-card-btn"
            type="button"
            onClick={() => setActiveTab('preview_card')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'preview_card'
                ? 'border-[#007a5a] text-[#007a5a]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Privacy Preview Card</span>
          </button>

          <button
            id="invite-tab-specs-btn"
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'specs'
                ? 'border-[#007a5a] text-[#007a5a]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Keys & JSON</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 space-y-5 flex-1 overflow-y-auto">
          {/* TAB 1: 1-CLICK LINK */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Recipient Teammate Name (Optional)
                </label>
                <input
                  id="invite-recipient-name-input"
                  type="text"
                  placeholder="e.g. Alex, Sarah, Devon"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Decentralized Workspace URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    id="invite-link-input"
                    className="flex-1 px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-mono text-neutral-700 select-all outline-none"
                  />
                  <button
                    id="copy-invite-link-btn"
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-[#007a5a] hover:bg-[#148567] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs flex-shrink-0 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1.5">
                  Includes workspace credentials. Anyone with this link can join the P2P mesh and sync state directly.
                </p>
              </div>

              {/* Quick Action Share Row */}
              <div className="pt-2 flex items-center gap-2 flex-wrap">
                {typeof navigator !== 'undefined' && (navigator as any).share && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="px-3 py-1.5 bg-neutral-900 text-white hover:bg-neutral-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share via Device...</span>
                  </button>
                )}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={mailUrl}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-red-500" />
                  <span>Email / Gmail</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: SHARE TO SOCIAL APPS */}
          {activeTab === 'social' && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-600">
                Share this workspace invite directly into messaging channels or team threads:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">WhatsApp</div>
                      <div className="text-[10.5px] text-emerald-700">Send to chat or team group</div>
                    </div>
                  </div>
                  <Share2 className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition" />
                </a>

                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl flex items-center justify-between text-sky-900 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Telegram</div>
                      <div className="text-[10.5px] text-sky-700">Direct message or channel</div>
                    </div>
                  </div>
                  <Share2 className="w-4 h-4 text-sky-600 group-hover:translate-x-0.5 transition" />
                </a>

                <a
                  href={mailUrl}
                  className="p-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl flex items-center justify-between text-neutral-900 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Gmail / Email</div>
                      <div className="text-[10.5px] text-neutral-600">Formatted email invitation</div>
                    </div>
                  </div>
                  <Share2 className="w-4 h-4 text-neutral-600 group-hover:translate-x-0.5 transition" />
                </a>

                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-neutral-900 hover:bg-black border border-neutral-800 rounded-xl flex items-center justify-between text-white transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white text-neutral-900 flex items-center justify-center font-bold">
                      𝕏
                    </div>
                    <div>
                      <div className="text-xs font-bold">X (Twitter)</div>
                      <div className="text-[10.5px] text-neutral-400">Post or send in direct message</div>
                    </div>
                  </div>
                  <Share2 className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition" />
                </a>
              </div>

              {typeof navigator !== 'undefined' && (navigator as any).share && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border border-neutral-300"
                  >
                    <Smartphone className="w-4 h-4 text-neutral-600" />
                    <span>Open Native Device Share Sheet</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: QR CODE */}
          {activeTab === 'qr' && (
            <div id="invite-qr-container" className="flex flex-col items-center justify-center space-y-4 py-2">
              <div className="p-3 bg-white border-2 border-neutral-900 rounded-2xl shadow-md">
                {qrDataUrl ? (
                  <img
                    id="invite-qr-image"
                    src={qrDataUrl}
                    alt="Workspace Invite QR Code"
                    className="w-56 h-56 rounded-lg"
                  />
                ) : (
                  <div id="invite-qr-generating" className="w-56 h-56 flex items-center justify-center text-xs text-neutral-400">
                    Generating QR Code...
                  </div>
                )}
              </div>

              <div className="text-center space-y-1">
                <div className="text-xs font-bold text-neutral-900">
                  Scan to Join on Mobile Instantly
                </div>
                <div className="text-[11px] text-neutral-500 max-w-xs">
                  Point any phone camera at this QR code to join {activeWorkspace.name} without typing passwords.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="download-qr-btn"
                  type="button"
                  onClick={handleDownloadQR}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download QR PNG</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy URL'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: PRIVACY-SAFE PREVIEW CARD / SCREENSHOT */}
          {activeTab === 'preview_card' && (
            <div id="invite-preview-card-container" className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Privacy-Preserving Share Card: </span>
                  Actual chat history, usernames, and private messages are intentionally abstracted and redacted. Sharing this visual preview reveals zero confidential or personal data.
                </div>
              </div>

              <div className="rounded-xl overflow-hidden border border-neutral-300 shadow-md bg-neutral-950 flex items-center justify-center p-2">
                <canvas
                  id="invite-preview-canvas"
                  ref={previewCanvasRef}
                  className="w-full max-w-[500px] h-auto rounded-lg shadow-inner"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Zero-PII Wireframe Format</span>
                </div>
                <button
                  id="download-preview-card-btn"
                  type="button"
                  onClick={handleDownloadPreviewCard}
                  className="px-4 py-2 bg-[#007a5a] hover:bg-[#148567] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  {copiedCard ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{copiedCard ? 'Saved PNG!' : 'Export Preview Card'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: CRYPTOGRAPHIC SPECS & JSON */}
          {activeTab === 'specs' && (
            <div className="space-y-4">
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-600" /> Workspace Passphrase:
                  </span>
                  <span className="font-mono font-bold text-neutral-900">
                    {activeWorkspace.passphrase || 'Open-Access'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-600" /> Active Nostr Relays:
                  </span>
                  <span className="font-semibold text-neutral-800">
                    {activeWorkspace.relays.length} Public Relays
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Security Layer:
                  </span>
                  <span className="font-semibold text-emerald-700">
                    ECDSA P-256 + ECDH / AES-GCM
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Raw Workspace JSON
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="text-xs text-[#1264A3] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedJson ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <pre className="p-3 bg-neutral-900 text-neutral-200 rounded-lg text-[11px] font-mono overflow-x-auto max-h-28">
                  {jsonConfig}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between flex-shrink-0">
          <div className="text-[11px] text-neutral-500 hidden sm:flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-neutral-400" />
            <span>Encrypted P2P Rendezvous</span>
          </div>
          <button
            id="close-invite-modal-bottom-btn"
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-bold transition cursor-pointer ml-auto"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
