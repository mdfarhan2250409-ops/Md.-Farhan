import React, { useState } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  Lock,
  UserPlus,
  Download,
  Send,
  AlertTriangle,
  Headphones,
  Camera,
  Sparkles,
  Code2,
  FileCode
} from 'lucide-react';

export type SupportContextAction =
  | 'login'
  | 'register'
  | 'download'
  | 'telegram'
  | 'report_issue'
  | 'human_support'
  | 'send_screenshot';

export interface ChatMessageContentProps {
  content: string;
  isUser: boolean;
  onActionClick?: (action: SupportContextAction) => void;
}

/**
 * Utility to strip markdown syntax and action tags for clipboard copying
 */
export function getCleanTextForClipboard(rawText: string): string {
  if (!rawText) return '';
  let text = rawText;

  // 1. Remove action tags like [🔐 Login], [🚨 Report Issue], etc.
  text = text.replace(/\[(?:🔐|📝|📥|✈️|🚨|👨‍💻|📸|Login|Sign In|Create Account|Download|Telegram|Report Issue|Human Support|Send Screenshot)[^\]]*\]/gi, '');

  // 2. Remove fenced code blocks wrappers ```...``` but preserve code content
  text = text.replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g, '$1');

  // 3. Remove inline code `...`
  text = text.replace(/`([^`]+)`/g, '$1');

  // 4. Remove Markdown links [Label](URL) -> Label (URL)
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)');

  // 5. Remove bold/italic markers
  text = text.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');

  // 6. Remove headings (###, ##, #)
  text = text.replace(/^#{1,6}\s+/gm, '');

  // 7. Remove blockquote markers (> )
  text = text.replace(/^>\s+/gm, '');

  // 8. Clean extra whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

/**
 * Utility to produce clean natural spoken text for speech synthesis
 */
export function cleanTextForSpeechSynthesis(rawText: string): string {
  if (!rawText) return '';
  let text = rawText;

  // 1. Remove action tags
  text = text.replace(/\[(?:🔐|📝|📥|✈️|🚨|👨‍💻|📸|Login|Sign In|Create Account|Download|Telegram|Report Issue|Human Support|Send Screenshot|লগইন|অ্যাকাউন্ট|একাউন্ট|ডাউনলোড|টেলিগ্রাম|রিপোর্ট|লাইভ সাপোর্ট|স্ক্রিনশট)[^\]]*\]/gi, ' ');

  // 2. Remove code blocks entirely (code is awkward to read aloud)
  text = text.replace(/```[\s\S]*?```/g, ' ');

  // 3. Remove inline code `...`
  text = text.replace(/`([^`]+)`/g, '$1');

  // 4. Remove Markdown links [Label](URL) -> Label
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 5. Remove standalone URLs
  text = text.replace(/https?:\/\/\S+/gi, ' ');
  text = text.replace(/t\.me\/\S+/gi, ' ');

  // 6. Remove bold/italic symbols
  text = text.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');
  text = text.replace(/[*_]/g, ' ');

  // 7. Remove Markdown headings (#, ##, ###)
  text = text.replace(/^#{1,6}\s+/gm, '');

  // 8. Remove blockquotes and list markers
  text = text.replace(/^>\s+/gm, '');
  text = text.replace(/^[-*+]\s+/gm, '');
  text = text.replace(/^\d+\.\s+/gm, '');

  // 9. Remove decorative emojis
  text = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ');

  // 10. Normalize punctuation
  text = text.replace(/\s*।\s*/g, '। ');
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Fenced Code Block with copy-to-clipboard button and "Copied ✓" state
 */
const CodeBlockView: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPrompt = language.toLowerCase() === 'prompt' || language.toLowerCase() === 'ai-prompt';

  if (isPrompt) {
    return (
      <div className="my-3 rounded-xl border border-cyan-500/30 bg-slate-950/90 overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-3.5 py-2 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-slate-950 border-b border-cyan-500/20">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-200">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Prompt Copy</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-medium transition cursor-pointer active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied ✓</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Prompt</span>
              </>
            )}
          </button>
        </div>
        <div className="p-3.5 font-mono text-xs text-cyan-100/90 whitespace-pre-wrap leading-relaxed select-text bg-slate-950/60">
          {code}
        </div>
      </div>
    );
  }

  return (
    <div className="my-3 rounded-xl border border-white/10 bg-slate-950 overflow-hidden shadow-md">
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
          </span>
          <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase">
            {language || 'CODE'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition cursor-pointer active:scale-95"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">Copied ✓</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto font-mono text-xs text-cyan-200/90 leading-relaxed scrollbar-thin select-text bg-slate-950">
        <code>{code}</code>
      </pre>
    </div>
  );
};

/**
 * Render Markdown Tables cleanly with responsive horizontal scroll
 */
const TableView: React.FC<{ rows: string[][] }> = ({ rows }) => {
  if (!rows || rows.length < 2) return null;
  const header = rows[0];
  const body = rows.slice(1);

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 scrollbar-thin">
      <table className="min-w-full text-xs text-left divide-y divide-white/10">
        <thead>
          <tr className="bg-slate-900/90">
            {header.map((col, idx) => (
              <th
                key={idx}
                className="px-3.5 py-2.5 text-cyan-300 font-semibold tracking-wider"
              >
                {renderInlineMarkdown(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {body.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-white/5 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3.5 py-2 text-slate-200 whitespace-pre-wrap">
                  {renderInlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Safely parse inline Markdown: bold, italic, inline code, and URLs/links
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Split by inline markdown tokens: `code`, **bold**, *italic*, [label](url), plain url
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^\)]+\)|https?:\/\/[^\s]+|t\.me\/[^\s]+)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline code `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-white/10 text-cyan-300 font-mono text-[11px] sm:text-xs"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} className="font-semibold text-cyan-100">
          {renderInlineMarkdown(part.slice(2, -2))}
        </strong>
      );
    }

    // Italic *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={index} className="italic text-slate-300">
          {renderInlineMarkdown(part.slice(1, -1))}
        </em>
      );
    }

    // Markdown link [Label](URL)
    const mdLinkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+|t\.me\/[^\s)]+)\)$/);
    if (mdLinkMatch) {
      const href = mdLinkMatch[2].startsWith('t.me') ? `https://${mdLinkMatch[2]}` : mdLinkMatch[2];
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline font-medium inline-flex items-center gap-0.5 break-all"
        >
          <span>{mdLinkMatch[1]}</span>
          <ExternalLink className="w-3 h-3 inline-block shrink-0" />
        </a>
      );
    }

    // Plain URL
    if (part.startsWith('http://') || part.startsWith('https://') || part.startsWith('t.me/')) {
      const href = part.startsWith('t.me/') ? `https://${part}` : part;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline font-medium inline-flex items-center gap-0.5 break-all"
        >
          <span>{part}</span>
          <ExternalLink className="w-3 h-3 inline-block shrink-0" />
        </a>
      );
    }

    return part;
  });
}

/**
 * Contextual Action Buttons component
 */
const ActionButtonsBar: React.FC<{
  actions: SupportContextAction[];
  onActionClick?: (action: SupportContextAction) => void;
}> = ({ actions, onActionClick }) => {
  if (!actions || actions.length === 0 || !onActionClick) return null;

  const actionConfigs: Record<
    SupportContextAction,
    { label: string; icon: React.FC<{ className?: string }>; colorClass: string }
  > = {
    login: {
      label: 'Login',
      icon: Lock,
      colorClass: 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/30 text-cyan-200'
    },
    register: {
      label: 'Create Account',
      icon: UserPlus,
      colorClass: 'bg-blue-500/15 hover:bg-blue-500/25 border-blue-500/30 text-blue-200'
    },
    download: {
      label: 'Download Resource',
      icon: Download,
      colorClass: 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-200'
    },
    telegram: {
      label: 'Telegram Channel',
      icon: Send,
      colorClass: 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/30 text-sky-200'
    },
    report_issue: {
      label: 'Report Issue',
      icon: AlertTriangle,
      colorClass: 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-200'
    },
    human_support: {
      label: 'Human Support',
      icon: Headphones,
      colorClass: 'bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/30 text-purple-200'
    },
    send_screenshot: {
      label: 'Send Screenshot',
      icon: Camera,
      colorClass: 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/30 text-cyan-200'
    }
  };

  return (
    <div className="flex flex-wrap gap-2 pt-2.5 mt-2.5 border-t border-white/10">
      {actions.map((act) => {
        const config = actionConfigs[act];
        if (!config) return null;
        const Icon = config.icon;
        return (
          <button
            key={act}
            type="button"
            onClick={() => onActionClick(act)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer active:scale-95 shadow-sm ${config.colorClass}`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Main ChatGPT-style response formatter and renderer
 */
export const ChatMessageContent: React.FC<ChatMessageContentProps> = ({
  content,
  isUser,
  onActionClick
}) => {
  if (!content) return null;

  // Simple rendering for user messages
  if (isUser) {
    return (
      <div className="whitespace-pre-wrap leading-relaxed select-text">
        {renderInlineMarkdown(content)}
      </div>
    );
  }

  // 1. Detect contextual actions and strip action tags from the text body
  const detectedActions: SupportContextAction[] = [];
  let cleanContent = content;

  // Pattern detection for explicit tags like [🔐 Login] or [Report Issue]
  const actionTags: { pattern: RegExp; action: SupportContextAction }[] = [
    { pattern: /\[(?:🔐|🔑)?\s*(?:Login|Sign In|লগইন)\]/gi, action: 'login' },
    { pattern: /\[(?:📝|✨)?\s*(?:Create Account|Register|Sign Up|অ্যাকাউন্ট|একাউন্ট)\]/gi, action: 'register' },
    { pattern: /\[(?:📥|⬇️)?\s*(?:Download|ডাউনলোড)\]/gi, action: 'download' },
    { pattern: /\[(?:✈️|📢)?\s*(?:Telegram|টেলিগ্রাম)\]/gi, action: 'telegram' },
    { pattern: /\[(?:🚨|⚠️)?\s*(?:Report Issue|Report Problem|রিপোর্ট)\]/gi, action: 'report_issue' },
    { pattern: /\[(?:👨‍💻|🎧|🤝)?\s*(?:Human Support|Talk to Human|লাইভ সাপোর্ট|এডমিন)\]/gi, action: 'human_support' },
    { pattern: /\[(?:📸|🖼️)?\s*(?:Send Screenshot|Screenshot|স্ক্রিনশট)\]/gi, action: 'send_screenshot' }
  ];

  for (const { pattern, action } of actionTags) {
    if (pattern.test(cleanContent)) {
      if (!detectedActions.includes(action)) detectedActions.push(action);
      cleanContent = cleanContent.replace(pattern, '');
    }
  }

  // Only if no explicit tags exist, check if message is a targeted technical/support response with high certainty:
  // Note: We avoid showing buttons for simple greetings or casual conversation as required!
  const isSimpleGreetingOrChat = /^(হাই|হ্যালো|সালাম|hi|hello|hey|thanks|ধন্যবাদ)/i.test(cleanContent.trim()) && cleanContent.length < 100;
  if (!isSimpleGreetingOrChat && detectedActions.length === 0) {
    const lower = cleanContent.toLowerCase();
    if (lower.includes('report problem') || lower.includes('report issue') || lower.includes('সমস্যা রিপোর্ট')) {
      detectedActions.push('report_issue');
    }
    if (lower.includes('talk to human') || lower.includes('human support') || lower.includes('সাপোর্ট টিম') || lower.includes('এডমিন')) {
      detectedActions.push('human_support');
    }
    if (lower.includes('screenshot') || lower.includes('স্ক্রিনশট')) {
      detectedActions.push('send_screenshot');
    }
  }

  // 2. Parse Markdown Blocks (Code Blocks, Tables, Headings, Lists, Blockquotes, Paragraphs)
  // Split by fenced code blocks ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(cleanContent)) !== null) {
    const textBefore = cleanContent.slice(lastIndex, match.index);
    if (textBefore) {
      elements.push(
        <React.Fragment key={`text-${lastIndex}`}>
          {renderMarkdownText(textBefore, isUser)}
        </React.Fragment>
      );
    }

    const lang = match[1] || '';
    const code = match[2];
    elements.push(
      <CodeBlockView key={`code-${match.index}`} language={lang} code={code} />
    );

    lastIndex = match.index + match[0].length;
  }

  const remainingText = cleanContent.slice(lastIndex);
  if (remainingText) {
    elements.push(
      <React.Fragment key={`text-remaining`}>
        {renderMarkdownText(remainingText, isUser)}
      </React.Fragment>
    );
  }

  return (
    <div className="space-y-2 select-text leading-relaxed">
      {elements}
      {detectedActions.length > 0 && onActionClick && (
        <ActionButtonsBar actions={detectedActions} onActionClick={onActionClick} />
      )}
    </div>
  );
};

/**
 * Render Markdown non-code blocks (Headings, Tables, Lists, Quotes, Paragraphs)
 */
function renderMarkdownText(text: string, isUser = false): React.ReactNode {
  if (!text) return null;

  const lines = text.split(/\r?\n/);
  const renderedNodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Markdown Table Detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const rowText = lines[i].trim();
        // Check if separator row like |---|---|
        if (!/^\|[\s:-|-]+\|$/.test(rowText)) {
          const cells = rowText
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());
          tableRows.push(cells);
        }
        i++;
      }
      if (tableRows.length > 0) {
        renderedNodes.push(<TableView key={`table-${i}`} rows={tableRows} />);
      }
      continue;
    }

    // Heading 1 (# ...)
    if (/^#\s+/.test(trimmed)) {
      renderedNodes.push(
        <h1
          key={`h1-${i}`}
          className="text-base sm:text-lg font-black text-white mt-3.5 mb-1.5 first:mt-0 tracking-tight"
        >
          {renderInlineMarkdown(trimmed.replace(/^#\s+/, ''))}
        </h1>
      );
      i++;
      continue;
    }

    // Heading 2 (## ...)
    if (/^##\s+/.test(trimmed)) {
      renderedNodes.push(
        <h2
          key={`h2-${i}`}
          className="text-sm sm:text-base font-bold text-cyan-200 mt-3 mb-1.5 first:mt-0 tracking-tight"
        >
          {renderInlineMarkdown(trimmed.replace(/^##\s+/, ''))}
        </h2>
      );
      i++;
      continue;
    }

    // Heading 3 (### ...)
    if (/^###\s+/.test(trimmed)) {
      renderedNodes.push(
        <h3
          key={`h3-${i}`}
          className="text-xs sm:text-sm font-bold text-cyan-300 mt-3 mb-1 first:mt-0 tracking-wide flex items-center gap-1.5"
        >
          {renderInlineMarkdown(trimmed.replace(/^###\s+/, ''))}
        </h3>
      );
      i++;
      continue;
    }

    // Heading 4 (#### ...)
    if (/^####\s+/.test(trimmed)) {
      renderedNodes.push(
        <h4
          key={`h4-${i}`}
          className="text-xs font-semibold text-slate-200 mt-2 mb-1 first:mt-0"
        >
          {renderInlineMarkdown(trimmed.replace(/^####\s+/, ''))}
        </h4>
      );
      i++;
      continue;
    }

    // Blockquote (> ...)
    if (/^>\s*/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s*/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      renderedNodes.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 border-cyan-400 bg-cyan-950/25 rounded-r-xl px-3.5 py-2 my-2 text-slate-300 text-xs sm:text-sm italic leading-relaxed"
        >
          {quoteLines.map((ql, qIdx) => (
            <div key={qIdx}>{renderInlineMarkdown(ql)}</div>
          ))}
        </blockquote>
      );
      continue;
    }

    // Numbered List Items (1. , 2. )
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: { num: string; text: string }[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const itemMatch = lines[i].trim().match(/^(\d+)\.\s+(.*)$/);
        if (itemMatch) {
          listItems.push({ num: itemMatch[1], text: itemMatch[2] });
        }
        i++;
      }
      renderedNodes.push(
        <div key={`ol-${i}`} className="my-2 space-y-1.5">
          {listItems.map((item, lIdx) => (
            <div key={lIdx} className="flex items-start gap-2.5 text-xs sm:text-sm">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[11px] shrink-0 mt-0.5 shadow-sm">
                {item.num}
              </span>
              <div className="flex-1 text-slate-200 leading-relaxed">
                {renderInlineMarkdown(item.text)}
              </div>
            </div>
          ))}
        </div>
      );
      continue;
    }

    // Bullet List Items (- , * , • )
    if (/^[-*•]\s+/.test(trimmed)) {
      const bulletItems: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        bulletItems.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }
      renderedNodes.push(
        <div key={`ul-${i}`} className="my-2 space-y-1.5">
          {bulletItems.map((item, bIdx) => (
            <div key={bIdx} className="flex items-start gap-2 text-xs sm:text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0 shadow-sm" />
              <div className="flex-1 text-slate-200 leading-relaxed">
                {renderInlineMarkdown(item)}
              </div>
            </div>
          ))}
        </div>
      );
      continue;
    }

    // Regular Paragraph
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,4}\s+/.test(lines[i].trim()) &&
      !/^>\s*/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^[-*•]\s+/.test(lines[i].trim()) &&
      !(lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|'))
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }

    if (paragraphLines.length > 0) {
      renderedNodes.push(
        <p
          key={`p-${i}`}
          className={`text-xs sm:text-sm leading-relaxed my-1.5 first:mt-0 last:mb-0 ${
            isUser ? 'text-white' : 'text-slate-200'
          }`}
        >
          {paragraphLines.map((pl, plIdx) => (
            <React.Fragment key={plIdx}>
              {plIdx > 0 && <br />}
              {renderInlineMarkdown(pl)}
            </React.Fragment>
          ))}
        </p>
      );
    }
  }

  return renderedNodes;
}
