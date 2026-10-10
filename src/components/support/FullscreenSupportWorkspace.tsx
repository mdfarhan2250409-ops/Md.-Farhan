import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SupportConversation, SupportMessage, SupportReport } from '../../types';
import { OtlLogo } from '../OtlLogo';
import { SupportSidebar } from './SupportSidebar';
import { SupportEmptyState } from './SupportEmptyState';
import { SupportMessageItem, ActiveAudioState } from './SupportMessageItem';
import { SupportContextAction } from './ChatMessageContent';
import {
  Menu,
  Minimize2,
  X,
  FileText,
  Headphones,
  Paperclip,
  Plus,
  ArrowUp,
  Image as ImageIcon,
  RotateCcw,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  Loader2,
  Wrench,
  Globe
} from 'lucide-react';

interface FullscreenSupportWorkspaceProps {
  conversation: SupportConversation | null;
  conversationsList: SupportConversation[];
  messages: SupportMessage[];
  inputText: string;
  isSending: boolean;
  isUploading: boolean;
  attachment: { name: string; url: string; type: string } | null;
  reports: SupportReport[];
  errorBanner: string | null;
  copiedMsgId: string | null;
  likedMsgIds: Set<string>;
  dislikedMsgIds: Set<string>;
  expandedSourcesMsgId: string | null;
  openMoreMenuMsgId: string | null;
  activeAudio: ActiveAudioState | null;
  currentUser: any;
  isAuthenticated: boolean;
  latestSuggestedAction: string | null;
  latestReportData: any;
  isHandoffLoading: boolean;
  onInputChange: (val: string) => void;
  onSendMessage: (customContent?: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: () => void;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onMinimize: () => void;
  onClose: () => void;
  onOpenReportModal: () => void;
  onRequestHandoff: () => void;
  onReopenReport: (reportId: string, reason: string) => void;
  onCopyMessage: (id: string, text: string) => void;
  onLikeMessage: (id: string) => void;
  onDislikeMessage: (id: string) => void;
  onShareMessage: (text: string) => void;
  onRegenerate: (index: number) => void;
  onEditUserMessage: (text: string) => void;
  onToggleSources: (id: string) => void;
  onToggleMoreMenu: (id: string) => void;
  onReadAloud: (msg: SupportMessage) => void;
  onStopAudio: () => void;
  onCloseAudio: () => void;
  onPlayBrowserSpeech: (text: string, msgId: string) => void;
  onZoomImage: (url: string) => void;
  onClearError: () => void;
  onDismissEscalation: () => void;
  onActionClick?: (action: SupportContextAction) => void;
}

export const FullscreenSupportWorkspace: React.FC<FullscreenSupportWorkspaceProps> = ({
  conversation,
  conversationsList,
  messages,
  inputText,
  isSending,
  isUploading,
  attachment,
  reports,
  errorBanner,
  copiedMsgId,
  likedMsgIds,
  dislikedMsgIds,
  expandedSourcesMsgId,
  openMoreMenuMsgId,
  activeAudio,
  currentUser,
  isAuthenticated,
  latestSuggestedAction,
  latestReportData,
  isHandoffLoading,
  onInputChange,
  onSendMessage,
  onFileUpload,
  onRemoveAttachment,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onMinimize,
  onClose,
  onOpenReportModal,
  onRequestHandoff,
  onReopenReport,
  onCopyMessage,
  onLikeMessage,
  onDislikeMessage,
  onShareMessage,
  onRegenerate,
  onEditUserMessage,
  onToggleSources,
  onToggleMoreMenu,
  onReadAloud,
  onStopAudio,
  onCloseAudio,
  onPlayBrowserSpeech,
  onZoomImage,
  onClearError,
  onDismissEscalation,
  onActionClick
}) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [reopeningReportId, setReopeningReportId] = useState<string | null>(null);
  const [reopenReasonText, setReopenReasonText] = useState('');

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on messages change
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, isSending]);

  // Handle scroll detection for "↓ New message" button
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottomBtn(isFarFromBottom);
  };

  // Keyboard shortcut: Escape to minimize
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMobileDrawerOpen) {
          setIsMobileDrawerOpen(false);
        } else {
          onMinimize();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileDrawerOpen, onMinimize]);

  // Handle Textarea Keydown (Enter to send, Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((inputText.trim() || attachment) && !isSending) {
        onSendMessage();
      }
    }
  };

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputText]);

  const activeReports = reports.filter(r => r.status !== 'closed');
  const isHumanHandling = conversation?.status === 'human_handling';
  const isWaitingHuman = conversation?.status === 'waiting_human';

  return (
    <div
      id="otl-fullscreen-support-workspace"
      className="fixed inset-0 z-50 flex flex-col w-screen h-screen min-h-[100dvh] bg-[#050C1A] text-slate-100 overflow-hidden font-sans select-none"
    >
      {/* 1. TOP HEADER */}
      <header className="h-16 px-3 sm:px-5 border-b border-white/10 bg-[#081226]/90 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          {/* Mobile Hamburger Toggle */}
          <button
            id="otl-btn-mobile-menu"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
            title="Open Conversations"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* OTL Logo */}
          <div
            onClick={onNewChat}
            className="shrink-0 flex items-center cursor-pointer group hover:scale-105 transition-transform"
            title="Click to start New Chat"
          >
            <OtlLogo size={36} animate={true} />
          </div>

          <div
            onClick={onNewChat}
            className="truncate cursor-pointer group"
            title="Click to start New Chat"
          >
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white tracking-wide truncate group-hover:text-cyan-300 transition-colors">
                OTL Live Support
              </h1>

              {conversation?.title && conversation.title !== 'New Conversation' && (
                <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-cyan-300/80 font-medium truncate max-w-[200px] lg:max-w-[320px]">
                  <span className="text-slate-500">•</span>
                  <span className="truncate">{conversation.title}</span>
                </span>
              )}

              {/* Status Badge */}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 ${
                  isHumanHandling
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : isWaitingHuman
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse'
                    : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isHumanHandling
                      ? 'bg-emerald-400'
                      : isWaitingHuman
                      ? 'bg-amber-400'
                      : 'bg-cyan-400 animate-ping'
                  }`}
                />
                <span>
                  {isHumanHandling
                    ? 'Live Specialist'
                    : isWaitingHuman
                    ? 'Waiting Agent'
                    : 'RAG AI'}
                </span>
              </span>
            </div>

            <p className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1 mt-0.5 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Verified Knowledge Base & Human Support</span>
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Report Issue Button */}
          <button
            id="otl-btn-report-issue"
            onClick={onOpenReportModal}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="File a Support Ticket / Report"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Report Issue</span>
          </button>

          {/* Talk to Human Button */}
          {!isHumanHandling && !isWaitingHuman && (
            <button
              id="otl-btn-talk-to-human"
              onClick={onRequestHandoff}
              disabled={isHandoffLoading}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Request Human Agent"
            >
              {isHandoffLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Headphones className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Talk to Human</span>
            </button>
          )}

          {/* Minimize / Restore (Return to Floating Widget) */}
          <button
            id="otl-btn-minimize-fullscreen"
            onClick={onMinimize}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
            title="Exit Fullscreen (Switch to Floating Widget)"
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          {/* Close Support */}
          <button
            id="otl-btn-close-fullscreen"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
            title="Close Support"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. BODY CONTENT: SIDEBAR + CHAT CANVAS */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Conversation Sidebar (Desktop & Mobile Drawer) */}
        <SupportSidebar
          conversations={conversationsList}
          activeConversationId={conversation?.id}
          onSelectConversation={onSelectConversation}
          onNewChat={onNewChat}
          onDeleteConversation={onDeleteConversation}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentUser={currentUser}
          isAuthenticated={isAuthenticated}
          isMobileDrawerOpen={isMobileDrawerOpen}
          onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Right Main Chat Area */}
        <div className="flex-1 flex flex-col h-full bg-[#050C1A] overflow-hidden relative">
          {/* Active Reports / Reopen Bar */}
          {activeReports.length > 0 && (
            <div className="px-4 py-2 bg-slate-900/90 border-b border-white/10 space-y-1.5 shrink-0">
              {activeReports.map(rep => {
                const isResolved = rep.status === 'resolved';
                return (
                  <div
                    key={rep.id}
                    className={`flex items-center justify-between gap-3 text-xs p-2 rounded-xl border ${
                      isResolved
                        ? 'bg-emerald-950/40 border-emerald-500/30'
                        : 'bg-cyan-950/40 border-cyan-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isResolved ? 'text-emerald-400' : 'text-cyan-400'
                        }`}
                      />
                      <span className="font-bold text-slate-200 truncate">
                        Ticket #{rep.id.slice(-6)}: {rep.title}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-mono ${
                          isResolved
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-cyan-500/20 text-cyan-300'
                        }`}
                      >
                        {rep.status}
                      </span>
                    </div>

                    {isResolved && (
                      <button
                        onClick={() => {
                          setReopeningReportId(rep.id);
                          setReopenReasonText('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reopen Ticket</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Error Banner */}
          {errorBanner && (
            <div className="px-4 py-2.5 bg-rose-500/20 border-b border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="truncate">{errorBanner}</span>
              </div>
              <button
                onClick={onClearError}
                className="p-1 rounded text-rose-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Messages Viewport */}
          <div
            id="otl-messages-viewport"
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin select-text"
          >
            <div className="max-w-4xl mx-auto space-y-5">
              {messages.length === 0 ? (
                <SupportEmptyState onSelectPrompt={onSendMessage} />
              ) : (
                messages.map((msg, idx) => (
                  <SupportMessageItem
                    key={msg.id}
                    message={msg}
                    index={idx}
                    copiedMsgId={copiedMsgId}
                    likedMsgIds={likedMsgIds}
                    dislikedMsgIds={dislikedMsgIds}
                    expandedSourcesMsgId={expandedSourcesMsgId}
                    openMoreMenuMsgId={openMoreMenuMsgId}
                    activeAudio={activeAudio}
                    onCopy={onCopyMessage}
                    onLike={onLikeMessage}
                    onDislike={onDislikeMessage}
                    onShare={onShareMessage}
                    onRegenerate={onRegenerate}
                    onEditUserMessage={onEditUserMessage}
                    onToggleSources={onToggleSources}
                    onToggleMoreMenu={onToggleMoreMenu}
                    onReadAloud={onReadAloud}
                    onStopAudio={onStopAudio}
                    onCloseAudio={onCloseAudio}
                    onPlayBrowserSpeech={onPlayBrowserSpeech}
                    onZoomImage={onZoomImage}
                    onActionClick={onActionClick}
                  />
                ))
              )}

              {/* Typing / Processing Indicator */}
              {isSending && (
                <div className="flex gap-3 items-center text-slate-400 text-xs py-2">
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    <OtlLogo size={28} animate={true} />
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-medium">
                      OTL Support is thinking...
                    </span>
                    <div className="flex gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#5DE2E7] animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#5DE2E7] animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#5DE2E7] animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Floating Scroll-to-Bottom Indicator */}
          <AnimatePresence>
            {showScrollBottomBtn && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => scrollToBottom(true)}
                className="absolute bottom-24 right-6 sm:right-10 p-2.5 rounded-full bg-[#133E87] hover:bg-cyan-600 text-white shadow-xl border border-cyan-400/50 flex items-center gap-1.5 text-xs font-bold transition cursor-pointer z-20"
              >
                <ChevronDown className="w-4 h-4" />
                <span className="hidden sm:inline">New Messages</span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Contextual Escalation Prompt (if problem unresolved) */}
          {latestSuggestedAction === 'offer_report' && (
            <div className="max-w-3xl sm:max-w-4xl w-full mx-auto px-4 mb-2">
              <div className="p-3 rounded-2xl bg-[#0B1D51]/95 border border-[#5DE2E7]/40 flex items-center justify-between gap-3 shadow-lg animate-fadeIn">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Wrench className="w-4 h-4 text-[#5DE2E7] shrink-0" />
                  <span className="text-xs text-slate-200 truncate font-medium">
                    Issue still not resolved? File an official report for human technician review.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={onOpenReportModal}
                    className="px-3 py-1.5 rounded-xl bg-[#5DE2E7] hover:bg-[#48cfd4] text-slate-950 font-black text-xs flex items-center gap-1.5 transition shadow cursor-pointer active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>File Ticket</span>
                  </button>
                  <button
                    onClick={onDismissEscalation}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. BOTTOM STICKY INPUT BAR */}
          <div className="px-4 pb-4 sm:pb-6 pt-2 bg-gradient-to-t from-[#050C1A] via-[#050C1A]/95 to-transparent shrink-0">
            <div className="max-w-3xl sm:max-w-4xl mx-auto">
              {/* Modern Unified Chat Input Container */}
              <div className="relative rounded-3xl bg-slate-900/95 border border-white/15 focus-within:border-cyan-400/70 focus-within:shadow-[0_0_25px_rgba(93,226,231,0.2)] transition duration-200 p-3 sm:p-4 flex flex-col">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileUpload}
                  className="hidden"
                />

                {/* Attached Image Thumbnail inside the input card (as in screenshot 2) */}
                {attachment && (
                  <div className="mb-2.5 flex items-center gap-3">
                    <div className="relative group inline-block">
                      <img
                        src={attachment.url}
                        alt={attachment.name || 'Attached screenshot'}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-cyan-400/50 shadow-lg"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={onRemoveAttachment}
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-slate-950/90 border border-white/25 text-white flex items-center justify-center hover:bg-rose-600 hover:border-rose-500 transition shadow-lg cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-left space-y-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-[#5DE2E7] border border-[#5DE2E7]/40 shadow-xs inline-flex items-center gap-1">
                        👁️ AI Vision Enabled
                      </span>
                      <p className="text-xs text-slate-300 truncate max-w-xs">{attachment.name}</p>
                    </div>
                  </div>
                )}

                {/* URL Detected Notice */}
                {/https?:\/\/[^\s]+/i.test(inputText) && (
                  <div className="mb-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-[#5DE2E7]/25 flex items-center gap-2 text-xs text-cyan-300">
                    <Globe className="w-4 h-4 text-[#5DE2E7] shrink-0 animate-pulse" />
                    <span className="font-medium">Web Link Detected — AI will fetch & inspect the webpage content</span>
                  </div>
                )}

                {/* Textarea with Ask anything placeholder */}
                <textarea
                  id="otl-fullscreen-textarea"
                  ref={textareaRef}
                  rows={1}
                  value={inputText}
                  onChange={e => onInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything"
                  className="w-full bg-transparent text-slate-100 placeholder-slate-400 text-sm focus:outline-none resize-none py-1.5 px-1 max-h-36 scrollbar-thin"
                />

                {/* Bottom Action Bar inside Card */}
                <div className="flex items-center justify-between pt-1.5 mt-0.5">
                  {/* Left: Plus button to attach image */}
                  <div className="flex items-center gap-1.5">
                    <button
                      id="otl-btn-attach-image"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || isSending}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition cursor-pointer disabled:opacity-50"
                      title="Attach image"
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      ) : (
                        <Plus className="w-5 h-5 stroke-[2]" />
                      )}
                    </button>
                  </div>

                  {/* Right: Primary Send Button (Blue circle with arrow up) */}
                  <div className="flex items-center gap-2">
                    <button
                      id="otl-btn-send-message"
                      type="button"
                      onClick={() => onSendMessage()}
                      disabled={(!inputText.trim() && !attachment) || isSending}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-r from-cyan-500 to-[#133E87] hover:from-cyan-400 hover:to-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed text-white transition flex items-center justify-center shadow-[0_0_15px_rgba(93,226,231,0.3)] cursor-pointer active:scale-95 shrink-0"
                      title="Send message (Enter)"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <ArrowUp className="w-4 h-4 font-black stroke-[2.5]" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reopen Ticket Reason Modal */}
      <AnimatePresence>
        {reopeningReportId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/15 p-5 shadow-2xl space-y-4 text-slate-200"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                  <span>Reopen Support Ticket</span>
                </h3>
                <button
                  onClick={() => setReopeningReportId(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Please tell us what went wrong or why the issue has recurred:
              </p>

              <textarea
                value={reopenReasonText}
                onChange={e => setReopenReasonText(e.target.value)}
                placeholder="Explain the recurring problem..."
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-400"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setReopeningReportId(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (reopeningReportId) {
                      onReopenReport(reopeningReportId, reopenReasonText);
                      setReopeningReportId(null);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  Submit & Reopen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
