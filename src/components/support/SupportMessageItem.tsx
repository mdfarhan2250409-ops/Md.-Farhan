import React from 'react';
import { SupportMessage } from '../../types';
import { OtlLogo } from '../OtlLogo';
import {
  ChatMessageContent,
  getCleanTextForClipboard,
  cleanTextForSpeechSynthesis,
  SupportContextAction
} from './ChatMessageContent';
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Share2,
  RefreshCw,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Loader2,
  Edit2,
  MoreHorizontal,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Headphones,
  Download,
  Send
} from 'lucide-react';

export interface ActiveAudioState {
  messageId: string;
  audioUrl?: string;
  status: 'generating' | 'playing' | 'paused' | 'error';
  detectedLanguage?: 'bn' | 'en' | 'mixed';
  isBrowserFallback?: boolean;
  duration?: number;
  currentTime?: number;
  error?: string;
}

interface SupportMessageItemProps {
  message: SupportMessage;
  index: number;
  copiedMsgId: string | null;
  likedMsgIds: Set<string>;
  dislikedMsgIds: Set<string>;
  expandedSourcesMsgId: string | null;
  openMoreMenuMsgId: string | null;
  activeAudio: ActiveAudioState | null;
  onCopy: (id: string, text: string) => void;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onShare: (text: string) => void;
  onRegenerate: (index: number) => void;
  onEditUserMessage: (text: string) => void;
  onToggleSources: (id: string) => void;
  onToggleMoreMenu: (id: string) => void;
  onReadAloud: (msg: SupportMessage) => void;
  onStopAudio: () => void;
  onCloseAudio: () => void;
  onPlayBrowserSpeech: (text: string, msgId: string) => void;
  onZoomImage: (url: string) => void;
  onActionClick?: (action: SupportContextAction) => void;
}

export const SupportMessageItem: React.FC<SupportMessageItemProps> = ({
  message: msg,
  index: idx,
  copiedMsgId,
  likedMsgIds,
  dislikedMsgIds,
  expandedSourcesMsgId,
  openMoreMenuMsgId,
  activeAudio,
  onCopy,
  onLike,
  onDislike,
  onShare,
  onRegenerate,
  onEditUserMessage,
  onToggleSources,
  onToggleMoreMenu,
  onReadAloud,
  onStopAudio,
  onCloseAudio,
  onPlayBrowserSpeech,
  onZoomImage,
  onActionClick
}) => {
  const isUser = msg.senderType === 'user' || msg.senderType === 'guest';
  const isAi = msg.senderType === 'ai';
  const isAdminMsg = msg.senderType === 'admin';
  const isSystem = msg.senderType === 'system';

  const formatAudioTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[11px] font-medium text-center max-w-[90%]">
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <div
      id={`msg-row-${msg.id}`}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
            isAdminMsg
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
              : 'flex items-center justify-center'
          }`}
        >
          {isAdminMsg ? (
            <Headphones className="w-4 h-4" />
          ) : (
            <OtlLogo size={28} animate={true} />
          )}
        </div>
      )}

      <div
        className={`max-w-[85%] sm:max-w-[78%] space-y-1.5 ${
          isUser ? 'items-end text-right' : 'items-start text-left'
        }`}
      >
        {/* Sender Info */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
          <span className="font-bold text-slate-300">
            {msg.senderName === 'OTL AI Support' ? 'OTL Live Support' : msg.senderName}
          </span>
          <span>
            {new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        {/* Attachment Thumbnail if present */}
        {((msg.attachments && msg.attachments.length > 0) || msg.attachment) && (
          <div className="mb-2 flex flex-wrap gap-2">
            {(msg.attachments && msg.attachments.length > 0
              ? msg.attachments
              : msg.attachment
              ? [msg.attachment]
              : []
            ).map((att, i) => (
              <div
                key={i}
                onClick={() => onZoomImage(att.url)}
                className="cursor-pointer overflow-hidden rounded-2xl border border-white/20 hover:border-cyan-400 transition mb-1.5 shadow-lg group relative max-w-[260px]"
              >
                <img
                  src={att.url}
                  alt={att.name || 'Attachment'}
                  className="w-full h-auto max-h-48 object-cover group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
                <div className="p-1.5 bg-slate-950/80 text-[10px] text-slate-300 flex items-center justify-between">
                  <span className="truncate max-w-[150px]">{att.name || 'Image'}</span>
                  <span className="text-cyan-400 font-bold ml-1">Click to Zoom</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`p-3.5 sm:p-4 rounded-2xl leading-relaxed text-xs sm:text-sm ${
            isUser
              ? 'bg-gradient-to-br from-[#133E87] to-cyan-600 text-white shadow-[0_0_20px_rgba(93,226,231,0.2)] rounded-tr-sm'
              : isAdminMsg
              ? 'bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-500/40 text-emerald-100 rounded-tl-sm'
              : 'bg-slate-900/90 border border-white/10 text-slate-200 rounded-tl-sm'
          }`}
        >
          <ChatMessageContent
            content={msg.content}
            isUser={isUser}
            onActionClick={onActionClick}
          />

          {/* Compact Product Download & Troubleshooting Card */}
          {msg.productCard && (
            <div className="mt-3 p-3 rounded-xl bg-slate-950/90 border border-cyan-500/30 shadow-[0_0_15px_rgba(93,226,231,0.12)]">
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                      {msg.productCard.title}
                    </h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-300">
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-medium">
                      {msg.productCard.isFree ? '100% Free' : msg.productCard.price || 'Free'}
                    </span>
                    {msg.productCard.version && (
                      <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10 font-mono text-[10px]">
                        v{msg.productCard.version}
                      </span>
                    )}
                    {msg.productCard.fileSize && (
                      <span className="text-slate-400 text-[10px]">
                        {msg.productCard.fileSize}
                      </span>
                    )}
                    <span className="text-emerald-400 font-medium text-[10px]">
                      • {msg.productCard.status || 'Active & Safe'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => onActionClick?.('download')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs transition cursor-pointer active:scale-95 shadow-md"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => onActionClick?.('telegram')}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 font-semibold text-xs transition cursor-pointer active:scale-95 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span>Telegram</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RAG Source Citations if present */}
        {isAi && msg.ragSources && msg.ragSources.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => onToggleSources(msg.id)}
              className="flex items-center gap-1.5 text-xs text-cyan-300/90 hover:text-cyan-300 transition font-medium cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{msg.ragSources.length} Grounded Sources Used</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  expandedSourcesMsgId === msg.id ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSourcesMsgId === msg.id && (
              <div className="mt-1.5 p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/20 space-y-1.5 text-xs">
                {msg.ragSources.map((s, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex items-center justify-between gap-2 text-slate-300"
                  >
                    <span className="truncate text-cyan-200">
                      • {s.title} ({s.category || 'General'})
                    </span>
                    {s.score && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {Math.round(s.score * 100)}% match
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Audio Player Bar (ElevenLabs / Browser TTS) */}
        {activeAudio?.messageId === msg.id && (
          <div className="mt-2 p-3 rounded-xl bg-slate-950/95 border border-cyan-500/30 shadow-[0_0_20px_rgba(93,226,231,0.18)] text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                  {activeAudio.status === 'generating' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  ) : activeAudio.status === 'playing' ? (
                    <Volume2 className="w-4 h-4 text-cyan-300 animate-pulse" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
                    <span>
                      {activeAudio.status === 'generating'
                        ? 'Generating Voice...'
                        : activeAudio.status === 'playing'
                        ? 'Reading Aloud'
                        : activeAudio.status === 'paused'
                        ? 'Paused'
                        : 'Voice Playback'}
                    </span>
                    {activeAudio.detectedLanguage && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-medium">
                        {activeAudio.detectedLanguage === 'bn'
                          ? 'বাংলা 🇧🇩'
                          : activeAudio.detectedLanguage === 'mixed'
                          ? 'Mixed 🌐'
                          : 'English 🇬🇧'}
                      </span>
                    )}
                    {activeAudio.isBrowserFallback && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                        Browser Voice
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {activeAudio.status !== 'generating' && (
                  <>
                    <button
                      onClick={() => onReadAloud(msg)}
                      className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition cursor-pointer"
                      title={activeAudio.status === 'playing' ? 'Pause' : 'Play'}
                    >
                      {activeAudio.status === 'playing' ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={onStopAudio}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      title="Stop"
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <button
                  onClick={onCloseAudio}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Close"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {activeAudio.status === 'generating' && (
              <div className="flex items-center gap-2 text-xs text-cyan-300/80 pt-0.5">
                <div className="flex items-end gap-0.5 h-3.5">
                  <span className="w-1 h-2 bg-cyan-400 animate-pulse" />
                  <span className="w-1 h-3.5 bg-cyan-400 animate-pulse" />
                  <span className="w-1 h-2.5 bg-cyan-400 animate-pulse" />
                  <span className="w-1 h-3 bg-cyan-400 animate-pulse" />
                </div>
                <span>ElevenLabs AI Voice Synthesizing...</span>
              </div>
            )}

            {activeAudio.status === 'playing' && (
              <div className="flex items-center gap-2.5 pt-0.5">
                <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-200"
                    style={{
                      width: activeAudio.duration
                        ? `${Math.min(
                            100,
                            ((activeAudio.currentTime || 0) / activeAudio.duration) * 100
                          )}%`
                        : '100%'
                    }}
                  />
                </div>
                <div className="text-[10px] font-mono text-slate-400 shrink-0">
                  {formatAudioTime(activeAudio.currentTime || 0)} /{' '}
                  {formatAudioTime(activeAudio.duration || 0)}
                </div>
              </div>
            )}

            {activeAudio.status === 'error' && (
              <div className="text-xs text-amber-300 flex items-start gap-1.5 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{activeAudio.error}</p>
                  {'speechSynthesis' in window && (
                    <button
                      onClick={() => onPlayBrowserSpeech(cleanTextForSpeechSynthesis(msg.content), msg.id)}
                      className="mt-1 text-xs text-cyan-300 underline font-bold hover:text-cyan-200 cursor-pointer"
                    >
                      Read with browser voice instead
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message Action Toolbar */}
        <div
          className={`flex items-center gap-1 pt-1 text-slate-400 relative ${
            isUser ? 'justify-end' : 'justify-start'
          }`}
        >
          {isAi && (
            <>
              {/* Copy */}
              <button
                onClick={() => onCopy(msg.id, getCleanTextForClipboard(msg.content))}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-cyan-300 transition text-xs cursor-pointer"
                title={copiedMsgId === msg.id ? 'Copied!' : 'Copy response'}
              >
                {copiedMsgId === msg.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Like */}
              <button
                onClick={() => onLike(msg.id)}
                className={`p-1.5 rounded-lg transition text-xs cursor-pointer ${
                  likedMsgIds.has(msg.id)
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'hover:bg-white/10 hover:text-cyan-300'
                }`}
                title="Good response"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>

              {/* Dislike */}
              <button
                onClick={() => onDislike(msg.id)}
                className={`p-1.5 rounded-lg transition text-xs cursor-pointer ${
                  dislikedMsgIds.has(msg.id)
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'hover:bg-white/10 hover:text-rose-400'
                }`}
                title="Poor response"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>

              {/* Share */}
              <button
                onClick={() => onShare(getCleanTextForClipboard(msg.content))}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-cyan-300 transition text-xs cursor-pointer"
                title="Share message"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>

              {/* Regenerate */}
              <button
                onClick={() => onRegenerate(idx)}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-cyan-300 transition text-xs cursor-pointer"
                title="Regenerate response"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              {/* Read Aloud Quick Button */}
              <button
                onClick={() => onReadAloud(msg)}
                className={`p-1.5 rounded-lg transition text-xs cursor-pointer flex items-center gap-1 ${
                  activeAudio?.messageId === msg.id
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'hover:bg-white/10 hover:text-cyan-300'
                }`}
                title="Read Aloud / শুনুন"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>

              {/* More Menu (...) */}
              <div className="relative">
                <button
                  onClick={() => onToggleMoreMenu(msg.id)}
                  className={`p-1.5 rounded-lg transition text-xs cursor-pointer ${
                    openMoreMenuMsgId === msg.id
                      ? 'bg-white/15 text-white'
                      : 'hover:bg-white/10 hover:text-white'
                  }`}
                  title="More actions"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>

                {openMoreMenuMsgId === msg.id && (
                  <div className="absolute left-0 bottom-full mb-1 w-48 rounded-xl bg-slate-900 border border-white/15 shadow-2xl p-1 z-30 text-xs space-y-0.5">
                    <button
                      onClick={() => onReadAloud(msg)}
                      className="w-full px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 text-left flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Read Aloud / শুনুন</span>
                    </button>
                    <button
                      onClick={() => onCopy(msg.id, msg.content)}
                      className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white text-left flex items-center gap-2 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Full Text</span>
                    </button>
                    <button
                      onClick={() => onShare(msg.content)}
                      className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white text-left flex items-center gap-2 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share Answer</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {isUser && (
            <>
              <button
                onClick={() => onCopy(msg.id, msg.content)}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-cyan-300 transition text-xs cursor-pointer"
                title={copiedMsgId === msg.id ? 'Copied!' : 'Copy'}
              >
                {copiedMsgId === msg.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => onEditUserMessage(msg.content)}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-cyan-300 transition text-xs cursor-pointer"
                title="Edit message"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple helper icon for X
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);
