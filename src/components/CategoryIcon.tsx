import React from 'react';
import {
  Smartphone,
  Layout,
  Bot,
  Sliders,
  Monitor,
  Film,
  Code,
  Sparkles,
  Palette,
  Layers,
  Shield,
  Cpu,
  Folder,
  Tag,
  Globe,
  Wrench,
  Gamepad2,
  Archive,
  Package,
  Music,
  Zap,
  BookOpen,
  Video,
  FileCode,
  LucideIcon
} from 'lucide-react';

export const ICON_OPTIONS: { name: string; label: string; icon: LucideIcon }[] = [
  { name: 'Smartphone', label: 'Mobile Apps (Smartphone)', icon: Smartphone },
  { name: 'Layout', label: 'Landing Pages / Web (Layout)', icon: Layout },
  { name: 'Bot', label: 'AI Prompts / Bots (Bot)', icon: Bot },
  { name: 'Sliders', label: 'Presets / Filters (Sliders)', icon: Sliders },
  { name: 'Monitor', label: 'PC / Desktop Software (Monitor)', icon: Monitor },
  { name: 'Code', label: 'Scripts / Code (Code)', icon: Code },
  { name: 'FileCode', label: 'Source Codes (FileCode)', icon: FileCode },
  { name: 'Palette', label: 'Graphics / UI UX (Palette)', icon: Palette },
  { name: 'Film', label: 'Video Assets / VFX (Film)', icon: Film },
  { name: 'Video', label: 'Video Templates (Video)', icon: Video },
  { name: 'Music', label: 'Audio / Sound Effects (Music)', icon: Music },
  { name: 'Gamepad2', label: 'Games / Mods (Gamepad)', icon: Gamepad2 },
  { name: 'Sparkles', label: 'Special / Magic (Sparkles)', icon: Sparkles },
  { name: 'Zap', label: 'Fast / Premium Tools (Zap)', icon: Zap },
  { name: 'Cpu', label: 'Tech / Hardware Tools (Cpu)', icon: Cpu },
  { name: 'Shield', label: 'Security / Antivirus (Shield)', icon: Shield },
  { name: 'Folder', label: 'Bundles / Collections (Folder)', icon: Folder },
  { name: 'Package', label: 'Product Packages (Package)', icon: Package },
  { name: 'Archive', label: 'ZIP / Archives (Archive)', icon: Archive },
  { name: 'Globe', label: 'Web Services / SaaS (Globe)', icon: Globe },
  { name: 'BookOpen', label: 'Courses / Ebooks (BookOpen)', icon: BookOpen },
  { name: 'Wrench', label: 'Utilities / Fixes (Wrench)', icon: Wrench },
  { name: 'Tag', label: 'Deals / Tags (Tag)', icon: Tag },
  { name: 'Layers', label: 'General / Multi-Layer (Layers)', icon: Layers },
];

export const CategoryIcon: React.FC<{
  name?: string;
  className?: string;
  fallback?: React.ReactNode;
}> = ({ name = '', className = 'w-5 h-5 text-[#5DE2E7]', fallback }) => {
  const normalized = (name || '').toLowerCase().trim();

  switch (normalized) {
    case 'smartphone':
    case 'mobile':
    case 'apps':
      return <Smartphone className={className} />;
    case 'layout':
    case 'landing-pages':
    case 'landing':
    case 'web':
      return <Layout className={className} />;
    case 'bot':
    case 'ai-prompts':
    case 'ai':
    case 'prompt':
      return <Bot className={className} />;
    case 'sliders':
    case 'lr-presets':
    case 'preset':
    case 'presets':
      return <Sliders className={className} />;
    case 'monitor':
    case 'pc':
    case 'software':
    case 'desktop':
      return <Monitor className={className} />;
    case 'code':
      return <Code className={className} />;
    case 'filecode':
    case 'file-code':
      return <FileCode className={className} />;
    case 'palette':
    case 'ui':
    case 'ux':
    case 'graphic':
    case 'graphics':
      return <Palette className={className} />;
    case 'film':
    case 'video':
      return <Film className={className} />;
    case 'music':
    case 'audio':
    case 'sound':
      return <Music className={className} />;
    case 'gamepad2':
    case 'gamepad':
    case 'game':
    case 'games':
      return <Gamepad2 className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'cpu':
      return <Cpu className={className} />;
    case 'shield':
    case 'security':
      return <Shield className={className} />;
    case 'folder':
      return <Folder className={className} />;
    case 'package':
      return <Package className={className} />;
    case 'archive':
      return <Archive className={className} />;
    case 'globe':
      return <Globe className={className} />;
    case 'bookopen':
    case 'book':
      return <BookOpen className={className} />;
    case 'wrench':
    case 'tool':
    case 'tools':
      return <Wrench className={className} />;
    case 'tag':
      return <Tag className={className} />;
    case 'layers':
    default:
      return fallback ? <>{fallback}</> : <Layers className={className} />;
  }
};
