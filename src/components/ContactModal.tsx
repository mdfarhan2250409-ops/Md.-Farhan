import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Send,
  Mail,
  MessageSquare,
  ChevronDown,
  Check,
  Youtube,
  Facebook,
  Instagram,
  Twitter,
  Globe,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { TikTokIcon } from './icons/TikTokIcon';
import { SocialButton } from '../types';
import { BrandIcon } from './BrandIcons';

export const ContactModal: React.FC = () => {
  const {
    isContactModalOpen,
    setIsContactModalOpen,
    contactSettings,
    siteSettings,
    addInquiry
  } = useApp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [telegramWhatsapp, setTelegramWhatsapp] = useState('');
  const [message, setMessage] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim() || !message.trim() || isSubmitting || isSuccess) return;

    setIsSubmitting(true);

    try {
      addInquiry({
        email: email.trim(),
        subject: fullName.trim(),
        userName: fullName.trim(),
        telegramWhatsapp: telegramWhatsapp.trim(),
        message: message.trim(),
        category: 'General Inquiry'
      });

      setIsSubmitting(false);
      setIsSuccess(true);

      setTimeout(() => {
        setFullName('');
        setEmail('');
        setTelegramWhatsapp('');
        setMessage('');
        setIsSuccess(false);
        setIsContactModalOpen(false);
      }, 1000);
    } catch {
      setIsSubmitting(false);
    }
  };

  const getSocialIcon = (platform: SocialButton['platform']) => {
    switch (platform) {
      case 'youtube':
        return <BrandIcon name="youtube" className="w-4 h-4 text-red-500" />;
      case 'facebook':
        return <BrandIcon name="facebook" className="w-4 h-4 text-blue-500" />;
      case 'tiktok':
        return <TikTokIcon className="w-4 h-4 text-[#FE2C55]" />;
      case 'instagram':
        return <BrandIcon name="instagram" className="w-4 h-4 text-pink-500" />;
      case 'twitter':
        return <Twitter className="w-4 h-4 text-cyan-400" />;
      case 'telegram':
        return <BrandIcon name="telegram" className="w-4 h-4 text-sky-400" />;
      default:
        return <BrandIcon name="globe" className="w-4 h-4 text-[#5DE2E7]" />;
    }
  };

  return (
    <AnimatePresence>
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsContactModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl bg-[#0B1D51]/95 border border-[#5DE2E7]/30 glass-panel rounded-3xl text-white overflow-hidden shadow-[0_0_60px_rgba(11,29,81,0.9)] max-h-[90vh] flex flex-col z-10 my-auto"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/50 shrink-0">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#5DE2E7]" />
              <h3 className="text-lg font-black text-white">{contactSettings.modalTitle || 'Contact & Support Center'}</h3>
            </div>
            <button
              onClick={() => setIsContactModalOpen(false)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
            
            {/* Telegram Main Option Hero Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-[#133E87]/40 to-blue-600/20 border border-[#5DE2E7]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#5DE2E7] text-slate-950 uppercase tracking-wider mb-1.5 inline-block">
                  {contactSettings.heroBadge || 'Fastest Support'}
                </span>
                <h4 className="text-base font-bold text-white mb-1">
                  {contactSettings.heroTitle || 'Need Assistance or Custom Mod Requests?'}
                </h4>
                <p className="text-xs text-slate-300">
                  {contactSettings.heroSubtitle || 'Get instant response from our support team or group moderators in real-time.'}
                </p>
              </div>

              <a
                href={contactSettings.telegramAdminUrl || 'https://t.me/OnlineTaskLabAdmin'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(93,226,231,0.5)] shrink-0 hover:scale-105 transition"
              >
                <BrandIcon name="telegram" className="w-4 h-4 text-white" />
                <span>{contactSettings.telegramButtonText || 'Chat Direct Support'}</span>
              </a>
            </div>

            {/* Social Media & Channels Links */}
            {contactSettings.socialButtons && contactSettings.socialButtons.filter(s => s.enabled).length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#5DE2E7]" />
                  Official Social Channels & Media
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {contactSettings.socialButtons.filter(s => s.enabled).map(social => (
                    <a
                      key={social.id}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 hover:border-[#5DE2E7]/60 hover:bg-slate-900/80 transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition">
                          {getSocialIcon(social.platform)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-[#5DE2E7] transition">
                            {social.title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[170px]">
                            {social.url}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 group-hover:text-white transition">
                        {social.badgeText && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-[#5DE2E7]">
                            {social.badgeText}
                          </span>
                        )}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Email Contact Form */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-[#5DE2E7]" />
                  {contactSettings.formTitle || 'Send an Email Inquiry'}
                </h4>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Your Email Address"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={telegramWhatsapp}
                      onChange={e => setTelegramWhatsapp(e.target.value)}
                      placeholder="Telegram / WhatsApp (Optional)"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Describe your issue or custom resource request..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none"
                />

                <div className="relative group w-full pt-1">
                  {/* Pulsing Official Cyber Glow Aura */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#5DE2E7] via-cyan-400 to-[#133E87] rounded-2xl blur-md opacity-50 group-hover:opacity-100 group-hover:blur-lg transition-all duration-500 animate-pulse pointer-events-none" />

                  {/* Main Animated Official Button */}
                  <motion.button
                    type="submit"
                    disabled={isSubmitting || isSuccess}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    className="relative w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#5DE2E7] via-[#38BDF8] to-[#0284C7] text-slate-950 font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(93,226,231,0.45)] hover:shadow-[0_0_40px_rgba(93,226,231,0.85)] border border-white/40 overflow-hidden cursor-pointer transition-all duration-300 active:opacity-95"
                  >
                    {/* Ambient Sliding Light Beam (Continuous + Hover sheen) */}
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/50 to-transparent ease-out pointer-events-none" />

                    {/* Subtle micro sparkle dot indicator */}
                    <span className="absolute top-1.5 right-3 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-200 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>

                    {isSuccess ? (
                      <span className="flex items-center gap-2 text-slate-950 font-black">
                        <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                        <span>Message Sent Successfully!</span>
                      </span>
                    ) : isSubmitting ? (
                      <span className="flex items-center gap-2 text-slate-950 font-black">
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Sending Message...</span>
                      </span>
                    ) : (
                      <>
                        <span className="drop-shadow-sm font-black">Send Inquiry Message</span>
                        <Send className="w-4 h-4 text-slate-950 transition-all duration-300 transform group-hover:translate-x-1.5 group-hover:-translate-y-0.5 group-hover:rotate-[-8deg] shrink-0" />
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </div>

            {/* FAQ Accordion */}
            {contactSettings.faqs && contactSettings.faqs.length > 0 && (
              <div className="border-t border-white/10 pt-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  {contactSettings.faqTitle || 'Frequently Asked Questions (FAQ)'}
                </h4>

                <div className="space-y-2">
                  {contactSettings.faqs.map(faq => (
                    <div
                      key={faq.id}
                      className="rounded-xl bg-slate-950/50 border border-white/10 overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                        className="w-full p-3 text-left text-xs font-bold text-slate-200 flex items-center justify-between hover:bg-white/5 transition"
                      >
                        <span>{faq.question}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-[#5DE2E7] transition-transform ${
                            openFaq === faq.id ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {openFaq === faq.id && (
                        <div className="p-3 text-xs text-slate-300 border-t border-white/5 bg-slate-900/50 leading-relaxed">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};

