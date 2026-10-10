import React from 'react';
import { motion } from 'motion/react';
import { OtlLogo } from '../OtlLogo';
import { Sparkles, HelpCircle, ShieldCheck, KeyRound, Download, Headphones } from 'lucide-react';

interface SupportEmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

export const SupportEmptyState: React.FC<SupportEmptyStateProps> = ({ onSelectPrompt }) => {
  const suggestedPrompts = [
    {
      icon: <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />,
      title: 'Create Account',
      subtitle: 'How do I create an account on OTL?',
      prompt: 'How do I create an account?'
    },
    {
      icon: <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />,
      title: 'OTP Problem',
      subtitle: 'আমার OTP আসছে না / OTP আসছে না',
      prompt: 'আমার OTP আসছে না'
    },
    {
      icon: <Download className="w-4 h-4 text-emerald-400 shrink-0" />,
      title: 'Download Resources',
      subtitle: 'How do I download verified files and presets?',
      prompt: 'How do I download resources on OTL?'
    },
    {
      icon: <Headphones className="w-4 h-4 text-indigo-400 shrink-0" />,
      title: 'Talk to Human',
      subtitle: 'Connect directly with our support team',
      prompt: 'I want to talk to human support'
    }
  ];

  return (
    <div id="otl-support-empty-state" className="h-full flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto space-y-6 select-none">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center space-y-3"
      >
        <div className="relative">
          <OtlLogo size={72} animate={true} />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
            OTL Live Support
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>AI Support Workspace & Verified Knowledge Base</span>
          </p>
        </div>
      </motion.div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-200">
          How can we help you today?
        </p>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Ask any question in Bangla, Banglish, or English. You can also explore suggested topics below.
        </p>
      </div>

      {/* Suggested Prompt Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-2">
        {suggestedPrompts.map((item, idx) => (
          <motion.button
            key={idx}
            id={`otl-suggested-prompt-${idx}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * idx, duration: 0.2 }}
            onClick={() => onSelectPrompt(item.prompt)}
            className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-white/10 hover:border-cyan-400/50 text-left transition duration-200 shadow-md hover:shadow-[0_0_20px_rgba(93,226,231,0.15)] group cursor-pointer"
          >
            <div className="p-2 rounded-xl bg-slate-950/80 border border-white/5 group-hover:border-cyan-400/30 transition">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition truncate">
                {item.title}
              </span>
              <span className="block text-[11px] text-slate-400 mt-0.5 leading-tight line-clamp-2">
                {item.subtitle}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
