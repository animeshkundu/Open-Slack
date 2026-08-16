import {
  ArrowRight,
  AtSign,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  Code2,
  Cpu,
  Database,
  ExternalLink,
  FileCode,
  Github,
  Globe,
  HardDrive,
  Hash,
  Headphones,
  Key,
  Layers,
  Lock,
  MessageSquare,
  Mic,
  Monitor,
  Radio,
  Share2,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  User,
  Users,
  Video,
  X,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { deriveUniqueHandle, generateAvatarSvg } from '../../lib/crypto';
import { generateHandleFromName } from '../../lib/mentions';

import { decodeDeviceSyncPayload } from '../../lib/multiDevice';

interface LandingPageProps {
  onEnterApp: () => void;
}

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

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const { activeWorkspace, createWorkspace, identity, updateProfile, joinWorkspace } = useWorkspace();
  const [activeDocTab, setActiveDocTab] = useState<'p2p' | 'crdt' | 'security' | 'responsive'>('p2p');

  // Two-Step Onboarding State
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  const [onboardingMode, setOnboardingMode] = useState<'create' | 'join'>('create');

  // Step 1: Profile fields
  const [fullName, setFullName] = useState(identity?.displayName || 'Animesh Kundu');
  const [handle, setHandle] = useState(identity?.handle || '@animesh');
  const [selectedColor, setSelectedColor] = useState(identity?.color || '#4A154B');

  // Step 2: Workspace fields
  const [wsName, setWsName] = useState('Acme Corp P2P');
  const [wsPassphrase, setWsPassphrase] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [joinLinkInput, setJoinLinkInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');

  const handleOpenOnboarding = () => {
    setOnboardingStep(1);
    setOnboardingMode('create');
    setIsOnboardingOpen(true);
  };

  const handleFullNameChange = (name: string) => {
    setFullName(name);
    // Auto-generate clean collision-free handle
    const autoHandle = deriveUniqueHandle(name, identity?.pubkey);
    setHandle(autoHandle);
  };

  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setOnboardingError('Please provide your full name.');
      return;
    }
    const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
    if (cleanHandle.length < 2) {
      setOnboardingError('Please provide a valid handle starting with @.');
      return;
    }

    // Save profile updates to identity
    const newAvatar = generateAvatarSvg(fullName, selectedColor);
    updateProfile({
      displayName: fullName.trim(),
      handle: cleanHandle.trim(),
      color: selectedColor,
      avatarUrl: newAvatar,
      hasCustomName: true,
    });

    setOnboardingError('');
    setOnboardingStep(2);
  };

  const handleCompleteLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setOnboardingError('');

    try {
      if (onboardingMode === 'create') {
        if (!wsName.trim()) {
          throw new Error('Please provide a workspace name');
        }
        await createWorkspace(wsName.trim(), wsPassphrase.trim() || undefined, {
          requireApprovalForInvites: requireApproval,
          defaultChannels: ['chan_general', 'chan_random'],
          allowGuestInvites: true,
        });
      } else {
        const input = joinLinkInput.trim();
        let wsData: any;
        if (input.includes('#device-sync=')) {
          const payloadStr = decodeURIComponent(input.split('#device-sync=')[1]);
          const parsed = decodeDeviceSyncPayload(payloadStr);
          if (parsed && parsed.workspaces && parsed.workspaces.length > 0) {
            wsData = parsed.workspaces[0];
          } else {
            throw new Error('Invalid device sync payload');
          }
        } else if (input.includes('#invite=')) {
          const payloadStr = decodeURIComponent(input.split('#invite=')[1]);
          wsData = JSON.parse(atob(payloadStr));
        } else if (input.startsWith('{')) {
          wsData = JSON.parse(input);
        } else {
          throw new Error('Invalid invite link or device sync payload');
        }
        joinWorkspace(wsData);
      }

      setIsOnboardingOpen(false);
      onEnterApp();
    } catch (err: any) {
      setOnboardingError(err?.message || 'Failed to complete setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="open-slack-landing-page" className="min-h-screen w-full overflow-x-hidden bg-white text-neutral-900 font-sans selection:bg-amber-100 selection:text-amber-900 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4A154B] to-[#611f69] text-white flex items-center justify-center font-black text-lg shadow-sm">
              #
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-neutral-950">Open-Slack</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                P2P v2.0
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-neutral-600">
            <a href="#features" className="hover:text-neutral-950 transition">Features</a>
            <a href="#interactive-docs" className="hover:text-neutral-950 transition">Architecture & Docs</a>
            <a href="#privacy-guarantee" className="hover:text-neutral-950 transition">Privacy Guarantees</a>
            <a href="#comparison" className="hover:text-neutral-950 transition">Slack Comparison</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="landing-open-app-nav-btn"
              type="button"
              onClick={handleOpenOnboarding}
              className="px-4 py-2 bg-[#4A154B] hover:bg-[#611f69] text-white rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>Launch Open-Slack</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 bg-gradient-to-b from-neutral-50 to-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Free, Instant Team Chat • Zero Setup or Central Servers</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-neutral-950 max-w-4xl mx-auto leading-[1.1] mb-6">
            Instant team chat with zero setup or servers.
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed mb-8">
            Everything you love about Slack - channels, direct messages, file sharing, and voice huddles - running 100% private in your browser.
          </p>

          {/* Quick Launch Hero Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const cleanName = fullName.trim() || 'Alex Rivera';
              const autoHandle = deriveUniqueHandle(cleanName, identity?.pubkey);
              const newAvatar = generateAvatarSvg(cleanName, selectedColor);

              updateProfile({
                displayName: cleanName,
                handle: autoHandle,
                color: selectedColor,
                avatarUrl: newAvatar,
                hasCustomName: true,
              });

              if (!activeWorkspace) {
                createWorkspace('My Workspace', undefined, {
                  requireApprovalForInvites: false,
                  defaultChannels: ['chan_general', 'chan_random'],
                  allowGuestInvites: true,
                });
              }

              onEnterApp();
            }}
            className="max-w-lg mx-auto mb-6 p-2 sm:p-2.5 bg-white border border-neutral-200 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center gap-2"
          >
            <input
              id="landing-user-name-input"
              data-testid="hero-fullname-input"
              type="text"
              placeholder="Your Display Name (e.g. Alex)"
              value={fullName}
              onChange={(e) => handleFullNameChange(e.target.value)}
              className="w-full flex-1 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 outline-none focus:border-purple-600 focus:bg-white transition"
            />
            <button
              id="hero-create-workspace-btn"
              data-testid="hero-launch-app-btn"
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-[#4A154B] hover:bg-[#611f69] text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <span>Start Chatting</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Docs & Onboarding Modal Secondary Link */}
          <div className="flex items-center justify-center gap-4 text-xs font-semibold text-neutral-500 mb-10">
            <a
              href="#interactive-docs"
              className="hover:text-neutral-900 transition flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Explore Technical Docs</span>
            </a>
            <span>•</span>
            <button
              type="button"
              id="open-modal-custom-setup"
              onClick={() => {
                setOnboardingStep(1);
                setIsOnboardingOpen(true);
              }}
              className="hover:text-[#4A154B] transition cursor-pointer"
            >
              Advanced Workspace Setup...
            </button>
          </div>

          {/* App Preview Mockup */}
          <div className="relative mx-auto max-w-5xl rounded-2xl border border-neutral-300/80 bg-neutral-900 p-2 sm:p-3 shadow-2xl overflow-hidden">
            <div className="bg-[#1A1D21] rounded-xl overflow-hidden border border-neutral-800 flex flex-col text-left">
              {/* Window Bar */}
              <div className="h-9 bg-[#121016] border-b border-neutral-800 flex items-center justify-between px-3 sm:px-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#EC6A5E]" />
                  <div className="w-3 h-3 rounded-full bg-[#F5BF4F]" />
                  <div className="w-3 h-3 rounded-full bg-[#62C554]" />
                </div>
                <div className="hidden sm:flex items-center gap-2 px-6 py-0.5 bg-white/10 rounded-md text-[11px] text-neutral-300 font-mono truncate">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>openslack://workspace/general • E2E Encrypted P2P Mesh</span>
                </div>
                <div className="hidden sm:flex text-[11px] text-neutral-400 font-mono items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>3 Peers Connected</span>
                </div>
              </div>

              {/* Workspace Mock Content */}
              <div className="flex h-80 sm:h-96">
                {/* Left Workspace Rail */}
                <div className="w-14 bg-[#3F0E40] border-r border-[#522653] flex flex-col items-center py-3 gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 text-white font-black flex items-center justify-center text-sm border-2 border-white">
                    OS
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center text-xs">
                    AC
                  </div>
                </div>

                {/* Channels Sidebar */}
                <div className="w-48 sm:w-56 bg-[#3F0E40] text-neutral-300 p-3 hidden sm:flex flex-col justify-between border-r border-[#522653]">
                  <div className="space-y-4">
                    <div className="font-extrabold text-white text-sm flex items-center justify-between">
                      <span>Acme Core P2P</span>
                      <span className="text-[10px] bg-emerald-700/60 text-emerald-200 px-1.5 py-0.5 rounded font-mono">LIVE</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold px-2">Channels</div>
                      <div className="px-2 py-1 bg-[#1164A3] text-white rounded-md text-xs font-bold flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5" /> general
                      </div>
                      <div className="px-2 py-1 hover:bg-white/10 text-neutral-300 rounded-md text-xs font-semibold flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5" /> dev-sync
                      </div>
                      <div className="px-2 py-1 hover:bg-white/10 text-neutral-300 rounded-md text-xs font-semibold flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5" /> random
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold px-2">Direct Messages</div>
                      <div className="px-2 py-1 text-neutral-300 text-xs font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" /> Sarah (Lead Architect)
                      </div>
                      <div className="px-2 py-1 text-neutral-300 text-xs font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" /> Alex (Security)
                      </div>
                    </div>
                  </div>

                  <div className="p-2 bg-black/20 rounded-lg text-[10px] text-neutral-300 font-mono flex items-center justify-between">
                    <span className="flex items-center gap-1"><Radio className="w-3 h-3 text-emerald-400" /> Nostr Relays: 4</span>
                    <span className="text-emerald-400 font-bold">100% OK</span>
                  </div>
                </div>

                {/* Chat Panel Mock */}
                <div className="flex-1 bg-white flex flex-col justify-between">
                  {/* Channel Header */}
                  <div className="h-12 border-b border-neutral-200 px-4 flex items-center justify-between bg-neutral-50/50">
                    <div className="flex min-w-0 items-center gap-2">
                      <Hash className="w-4 h-4 text-neutral-600" />
                      <span className="text-sm font-extrabold text-neutral-900">general</span>
                      <span className="hidden sm:inline text-xs text-neutral-400 truncate">| E2E encrypted team discussion</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-xs font-bold flex items-center gap-1">
                        <Headphones className="w-3.5 h-3.5 text-emerald-600" /> Huddle
                      </button>
                    </div>
                  </div>

                  {/* Mock Messages */}
                  <div className="p-4 space-y-3 overflow-y-auto">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                        SA
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-bold text-neutral-900">Sarah</span>
                          <span className="text-[10px] text-neutral-400">10:42 AM</span>
                        </div>
                        <p className="text-xs text-neutral-800 mt-0.5">
                          Just verified our P2P CRDT merge with 4 peers. Zero message drop over WebRTC datachannels! 🚀
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-blue-50 text-[#1264A3] border border-blue-200 rounded-full text-[10px] font-bold">
                            🎉 3
                          </span>
                          <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-full text-[10px] font-bold">
                            ❤️ 2
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 bg-amber-50/50 p-2 rounded-lg border-l-2 border-amber-500">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        AL
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-bold text-neutral-900">Alex</span>
                          <span className="text-[10px] text-neutral-400">10:44 AM</span>
                          <span className="text-[9px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-bold">@MENTION</span>
                        </div>
                        <p className="text-xs text-neutral-800 mt-0.5">
                          <span className="text-[#1264A3] font-bold">@channel</span> OPFS binary file transfer speed clocked at ~28 MB/s with full backpressure handling.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mock Input */}
                  <div className="p-3 border-t border-neutral-200 bg-neutral-50/50">
                    <div className="h-10 bg-white border border-neutral-300 rounded-lg px-3 flex items-center justify-between text-xs text-neutral-400">
                      <span>Message #general...</span>
                      <div className="flex items-center gap-2 text-neutral-400">
                        <AtSign className="w-3.5 h-3.5" />
                        <Mic className="w-3.5 h-3.5" />
                        <div className="w-5 h-5 bg-[#007a5a] text-white rounded flex items-center justify-center">
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#1264A3] mb-2">
              Autonomous Core Architecture
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
              Enterprise messaging capabilities without any central servers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/80 hover:border-neutral-300 transition">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#4A154B] flex items-center justify-center mb-4">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-2">Nostr Ephemeral Signaling</h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Connects peers across NAT firewalls via NIP-04/NIP-44 encrypted ephemeral Nostr relays. Once connected, signaling traffic drops to 0.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/80 hover:border-neutral-300 transition">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1264A3] flex items-center justify-center mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-2">Yjs CRDT State Synchronization</h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Conflict-free replicated data types ensure deterministic state convergence for channels, threads, reactions, and pinned messages across offline and online peers.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/80 hover:border-neutral-300 transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-2">Non-Custodial Cryptographic Keys</h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Identity is rooted in ECDSA P-256 and ECDH keypairs generated securely on your device. Export raw keys or JSON backups anytime.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/80 hover:border-neutral-300 transition">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-2">OPFS Binary Chunking</h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Transfers high-resolution files, documents, and voice notes directly peer-to-peer via 16KB WebRTC binary frames with active backpressure handling.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/80 hover:border-neutral-300 transition">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-2">Admin Approval Access Flow</h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Fine-grained workspace gatekeeping with one-click admin join approvals, customizable guest invite permissions, and pending verification queues.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/80 hover:border-neutral-300 transition">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-2">Desktop & Mobile Ergonomics</h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Tailwind CSS breakpoints and responsive mobile views with bottom navigation, drawer transitions, slide-over activity feeds, and audio synthesis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Documentation Section */}
      <section id="interactive-docs" className="py-20 bg-neutral-50 border-y border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#007a5a] mb-2">
              Interactive System Documentation
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
              Deep dive into the decentralized protocols.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 shadow-lg overflow-hidden flex flex-col md:flex-row min-h-[460px]">
            {/* Docs Tabs */}
            <div className="w-full md:w-64 bg-neutral-50 border-b md:border-b-0 md:border-r border-neutral-200 p-3 sm:p-4 flex md:block gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveDocTab('p2p')}
                className={`w-auto md:w-full flex-shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left cursor-pointer whitespace-nowrap ${
                  activeDocTab === 'p2p'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-200/60'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>WebRTC Mesh & Signaling</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDocTab('crdt')}
                className={`w-auto md:w-full flex-shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left cursor-pointer whitespace-nowrap ${
                  activeDocTab === 'crdt'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-200/60'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Yjs CRDT & IndexedDB</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDocTab('security')}
                className={`w-auto md:w-full flex-shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left cursor-pointer whitespace-nowrap ${
                  activeDocTab === 'security'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-200/60'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Zero-Knowledge Security</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDocTab('responsive')}
                className={`w-auto md:w-full flex-shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left cursor-pointer whitespace-nowrap ${
                  activeDocTab === 'responsive'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-200/60'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Responsive View Matrix</span>
              </button>
            </div>

            {/* Docs Content */}
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
              {activeDocTab === 'p2p' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-neutral-900">
                    <Radio className="w-5 h-5 text-[#1264A3]" />
                    <span>Nostr Ephemeral Signaling & WebRTC Data Channels</span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    Open-Slack uses Nostr relays as an out-of-band ephemeral signaling bus. When peers want to connect:
                  </p>
                  <ol className="list-decimal pl-5 text-xs sm:text-sm text-neutral-700 space-y-2">
                    <li>
                      <strong>Presence Announcement:</strong> Client posts a Nostr Event (Kind 20000) containing an ECDH public key, encrypted for the workspace ID.
                    </li>
                    <li>
                      <strong>SDP Offer/Answer Handshake:</strong> WebRTC SDP offers and ICE candidates are exchanged end-to-end encrypted across multiple redundant Nostr relays.
                    </li>
                    <li>
                      <strong>Direct RTCDataChannel:</strong> Once established, all text messages, cursor positions, audio huddles, and file transfers flow directly over peer-to-peer data channels.
                    </li>
                  </ol>
                  <div className="p-3 bg-neutral-900 text-emerald-400 rounded-lg font-mono text-xs overflow-x-auto">
                    <code>{`// Peer Mesh Connection Protocol
const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
const channel = pc.createDataChannel('openslack-sync', { ordered: true });
channel.onmessage = (e) => Y.applyUpdate(ydoc, new Uint8Array(e.data));`}</code>
                  </div>
                </div>
              )}

              {activeDocTab === 'crdt' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-neutral-900">
                    <Database className="w-5 h-5 text-purple-600" />
                    <span>Yjs CRDT & IndexedDB Local Persistence</span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    Every workspace state is represented by an autonomous Yjs CRDT Document:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="font-bold text-neutral-900 mb-1">Y.Array messages</div>
                      <div className="text-neutral-500">Ordered message stream with Lamport timestamps and pin flags.</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="font-bold text-neutral-900 mb-1">Y.Map channels</div>
                      <div className="text-neutral-500">Channel metadata, topic, descriptions, and privacy flags.</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="font-bold text-neutral-900 mb-1">Y.Array joinRequests</div>
                      <div className="text-neutral-500">Approval queue entries replicated across all workspace admins.</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="font-bold text-neutral-900 mb-1">IndexedDB Store</div>
                      <div className="text-neutral-500">Persists Yjs document snapshots locally for instant offline loading.</div>
                    </div>
                  </div>
                </div>
              )}

              {activeDocTab === 'security' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-neutral-900">
                    <Lock className="w-5 h-5 text-emerald-600" />
                    <span>Zero-Knowledge & End-to-End Cryptography</span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    The platform enforces mathematical zero-knowledge privacy guarantees:
                  </p>
                  <ul className="list-disc pl-5 text-xs sm:text-sm text-neutral-700 space-y-2">
                    <li><strong>Client-Side Key Generation:</strong> Keys are created via Web Crypto API (<code className="bg-neutral-100 px-1 py-0.5 rounded">subtle.generateKey</code>) and never touch any server.</li>
                    <li><strong>Forward Secrecy:</strong> Ephemeral signaling payloads expire immediately upon receipt.</li>
                    <li><strong>No Metadata Logging:</strong> Relays only see blinded pseudonymous public keys, never message text, channel names, or attachments.</li>
                  </ul>
                </div>
              )}

              {activeDocTab === 'responsive' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-neutral-900">
                    <Smartphone className="w-5 h-5 text-amber-600" />
                    <span>Responsive Breakpoint & Mobile View Matrix</span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    Designed for high-productivity switching across devices:
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                      <span className="font-bold flex items-center gap-1.5"><Monitor className="w-4 h-4 text-blue-600" /> Desktop (&gt;1024px)</span>
                      <span className="text-neutral-500 font-mono break-words">Workspace Rail + Sidebar + Chat Canvas + Thread Drawer</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                      <span className="font-bold flex items-center gap-1.5"><Tablet className="w-4 h-4 text-purple-600" /> Tablet (768px - 1024px)</span>
                      <span className="text-neutral-500 font-mono break-words">Collapsible Sidebar + Chat Canvas + Slide-Over Drawers</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                      <span className="font-bold flex items-center gap-1.5"><Smartphone className="w-4 h-4 text-amber-600" /> Mobile (&lt;768px)</span>
                      <span className="text-neutral-500 font-mono break-words">Single Active View + Bottom Nav Bar (Home, DMs, Activity, More)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Matrix Section */}
      <section id="comparison" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#4A154B] mb-2">
              Privacy Architecture Guarantees
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
              Open-Slack vs. Proprietary Cloud Messengers
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
              <thead className="bg-neutral-100/80 text-neutral-900 font-bold border-b border-neutral-200">
                <tr>
                  <th className="p-4">Capability & Privacy Vector</th>
                  <th className="p-4 bg-purple-50/70 text-[#4A154B] font-extrabold">Open-Slack (P2P)</th>
                  <th className="p-4 text-neutral-500">Proprietary Slack / Teams</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-neutral-700">
                <tr>
                  <td className="p-4 font-semibold text-neutral-900">Backend Server Requirements</td>
                  <td className="p-4 bg-purple-50/40 font-bold text-emerald-700">Zero (100% Client-Side P2P)</td>
                  <td className="p-4 text-neutral-500">Centralized Cloud Database</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-neutral-900">Message Storage & Archiving</td>
                  <td className="p-4 bg-purple-50/40 font-bold text-emerald-700">Encrypted Local IndexedDB</td>
                  <td className="p-4 text-neutral-500">Corporate Cloud Servers</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-neutral-900">End-to-End Encryption</td>
                  <td className="p-4 bg-purple-50/40 font-bold text-emerald-700">ECDSA P-256 / WebRTC DTLS</td>
                  <td className="p-4 text-neutral-500">TLS in transit (keys held by vendor)</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-neutral-900">File & Binary Storage</td>
                  <td className="p-4 bg-purple-50/40 font-bold text-emerald-700">Direct OPFS P2P Stream</td>
                  <td className="p-4 text-neutral-500">Amazon S3 / Azure Blob</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-neutral-900">Signaling Bus</td>
                  <td className="p-4 bg-purple-50/40 font-bold text-emerald-700">Decentralized Nostr Relays</td>
                  <td className="p-4 text-neutral-500">Proprietary WebSockets</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-neutral-900">Offline Functionality</td>
                  <td className="p-4 bg-purple-50/40 font-bold text-emerald-700">Full Offline Read/Write + Sync</td>
                  <td className="p-4 text-neutral-500">Limited / Read-Only</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-neutral-950 text-neutral-400 py-12 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#4A154B] text-white flex items-center justify-center font-black text-xs">
              #
            </div>
            <span className="font-bold text-neutral-200">Open-Slack</span>
            <span>- Open-source P2P team collaboration platform.</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={handleOpenOnboarding}
              className="text-neutral-300 hover:text-white font-semibold transition cursor-pointer"
            >
              Launch App
            </button>
            <a
              href="https://github.com/animeshkundu/Open-Slack"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-neutral-300 hover:text-white font-semibold transition"
            >
              <Github className="w-4 h-4" />
              <span>GitHub Repository</span>
            </a>
          </div>
        </div>
      </footer>

      {/* TWO-STEP MANDATORY ONBOARDING MODAL */}
      {isOnboardingOpen && (
        <div
          id="onboarding-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsOnboardingOpen(false)}
        >
          <div
            id="create-workspace-modal-card"
            data-testid="onboarding-modal-card"
            className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-neutral-200 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto my-2 sm:hidden flex-shrink-0" />

            {/* Header with Step Indicator */}
            <div className="p-5 border-b border-neutral-100 bg-neutral-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#4A154B] text-white flex items-center justify-center font-bold">
                  {onboardingStep === 1 ? <User className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#4A154B]">
                    Step {onboardingStep} of 2 • {onboardingStep === 1 ? 'Your Cryptographic Identity' : 'Workspace Setup'}
                  </div>
                  <h3 className="text-base font-black text-neutral-900">
                    {onboardingStep === 1 ? 'Set Up Your Profile' : 'Create or Join Workspace'}
                  </h3>
                </div>
              </div>
              <button
                id="close-onboarding-modal"
                type="button"
                onClick={() => setIsOnboardingOpen(false)}
                className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-500 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {onboardingError && (
              <div className="mx-5 mt-4 p-3 bg-red-50 text-red-700 text-xs font-medium rounded-lg border border-red-200">
                {onboardingError}
              </div>
            )}

            {/* Step 1: Mandatory Identity & Name Setup */}
            {onboardingStep === 1 ? (
              <form onSubmit={handleProceedToStep2} className="p-6 space-y-5 overflow-y-auto flex-1">
                <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-100 text-xs text-purple-900 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#4A154B] flex-shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Decentralized Mesh Identity:</strong> In peer-to-peer networks, your real name and handle prevent anonymous collision and identify you to your teammates.
                  </div>
                </div>

                {/* Avatar Preview & Color Picker */}
                <div className="flex items-center gap-4 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white text-lg shadow-sm flex-shrink-0"
                    style={{ backgroundColor: selectedColor }}
                  >
                    {fullName.trim().slice(0, 2).toUpperCase() || 'ME'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-neutral-700 mb-1.5">Avatar Color</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedColor(c)}
                          className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                            selectedColor === c ? 'ring-2 ring-neutral-900 scale-110' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="modal-user-name-input"
                    data-testid="modal-fullname-input"
                    type="text"
                    required
                    placeholder="e.g. Animesh Kundu"
                    value={fullName}
                    onChange={(e) => handleFullNameChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-sm text-neutral-900 outline-none focus:border-blue-500 focus:bg-white font-medium transition"
                    autoFocus
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                      Auto-Derived Alias (@handle)
                    </label>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                      <Lock className="w-2.5 h-2.5" /> Collision-Free
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-neutral-400 font-bold">@</span>
                    <input
                      id="landing-user-handle-input"
                      data-testid="onboarding-handle-input"
                      type="text"
                      required
                      readOnly
                      placeholder="animesh"
                      value={handle.replace(/^@/, '')}
                      onChange={(e) => setHandle(`@${e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '')}`)}
                      className="w-full pl-8 pr-3.5 py-2.5 bg-neutral-100 border border-neutral-200 rounded-lg text-sm text-neutral-700 outline-none font-mono font-bold transition select-all"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Your alias is auto-derived from your name to guarantee zero handle collisions across all workspaces.
                  </p>
                </div>

                <div className="pt-3">
                  <button
                    id="step1-next-btn"
                    data-testid="onboarding-next-step-btn"
                    type="submit"
                    disabled={!fullName.trim()}
                    className="w-full py-3 bg-[#4A154B] hover:bg-[#611f69] text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <span>Continue to Workspace Setup</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Workspace Creation or Direct Join */
              <form onSubmit={handleCompleteLaunch} className="p-6 space-y-5 overflow-y-auto flex-1">
                <div className="flex gap-2 p-1 bg-neutral-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingMode('create');
                      setOnboardingError('');
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                      onboardingMode === 'create'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Create New Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingMode('join');
                      setOnboardingError('');
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                      onboardingMode === 'join'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Join with Invite Link
                  </button>
                </div>

                {onboardingMode === 'create' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                        Workspace Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="landing-ws-name-input"
                        data-testid="onboarding-workspace-name-input"
                        type="text"
                        required
                        placeholder="e.g. Acme Corp P2P"
                        value={wsName}
                        onChange={(e) => setWsName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-sm text-neutral-900 outline-none focus:border-blue-500 focus:bg-white font-medium transition"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                        Passphrase (Optional)
                      </label>
                      <input
                        id="onboarding-passphrase-input"
                        type="text"
                        placeholder="Auto-generated 256-bit key if left blank"
                        value={wsPassphrase}
                        onChange={(e) => setWsPassphrase(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-sm text-neutral-900 outline-none focus:border-blue-500 focus:bg-white font-mono text-xs transition"
                      />
                    </div>

                    {/* Require Approval Toggle */}
                    <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div>
                        <div className="font-bold text-xs text-neutral-900">Require Admin Approval</div>
                        <div className="text-[11px] text-neutral-500">
                          Incoming members must be approved before viewing messages.
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          id="onboarding-require-approval-toggle"
                          type="checkbox"
                          checked={requireApproval}
                          onChange={(e) => setRequireApproval(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5.5 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#007a5a]"></div>
                      </label>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                      Invite Link or Workspace JSON
                    </label>
                    <textarea
                      id="onboarding-join-invite-input"
                      rows={4}
                      placeholder="Paste your #invite=... link or JSON configuration here"
                      value={joinLinkInput}
                      onChange={(e) => setJoinLinkInput(e.target.value)}
                      required
                      className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-mono outline-none focus:border-blue-500 focus:bg-white resize-none"
                      autoFocus
                    />
                  </div>
                )}

                <div className="pt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(1)}
                    className="px-4 py-2.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
                  >
                    ← Back
                  </button>

                  <button
                    id="submit-create-workspace-btn"
                    data-testid="onboarding-launch-workspace-btn"
                    type="submit"
                    disabled={isSubmitting || (onboardingMode === 'create' ? !wsName.trim() : !joinLinkInput.trim())}
                    className="flex-1 py-3 bg-[#007a5a] hover:bg-[#148567] text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <span>{isSubmitting ? 'Initializing...' : 'Launch Open-Slack'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
