import { ContactCategoryItem } from '../types';

export const DEFAULT_CONTACT_CATEGORIES: ContactCategoryItem[] = [
  { id: 'account_help', label: '💎 Account & Membership Support', emoji: '💎', name: 'Account & Membership Support', enabled: true, order: 1 },
  { id: 'resource_request', label: '📥 Custom Resource / Mod Request', emoji: '📥', name: 'Custom Resource / Mod Request', enabled: true, order: 2 },
  { id: 'download_issue', label: '⚠️ Broken Download / Link Issue', emoji: '⚠️', name: 'Broken Download / Link Issue', enabled: true, order: 3 },
  { id: 'preset_help', label: '🎨 Lightroom Presets / AI Prompts Help', emoji: '🎨', name: 'Lightroom Presets / AI Prompts Help', enabled: true, order: 4 },
  { id: 'bug_feedback', label: '💡 Bug Report & Feature Suggestion', emoji: '💡', name: 'Bug Report & Feature Suggestion', enabled: true, order: 5 },
  { id: 'general', label: '💬 General Message / Other', emoji: '💬', name: 'General Message / Other', enabled: true, order: 6 }
];

export const CONTACT_CATEGORIES = DEFAULT_CONTACT_CATEGORIES;

export const getEffectiveContactCategories = (
  customCategories?: ContactCategoryItem[],
  onlyEnabled: boolean = true
): ContactCategoryItem[] => {
  const list = (customCategories && customCategories.length > 0)
    ? customCategories
    : DEFAULT_CONTACT_CATEGORIES;

  if (onlyEnabled) {
    const enabled = list.filter(c => c.enabled !== false);
    return enabled.length > 0 ? enabled : list;
  }
  return list;
};

export const getCategoryLabelById = (
  idOrLabel?: string,
  customCategories?: ContactCategoryItem[]
): string => {
  if (!idOrLabel) return '💬 General Message / Other';
  const pool = (customCategories && customCategories.length > 0) ? customCategories : DEFAULT_CONTACT_CATEGORIES;
  
  const found = pool.find(c => c.id === idOrLabel || c.label === idOrLabel || c.name === idOrLabel);
  if (found) return found.label;

  const defaultFound = DEFAULT_CONTACT_CATEGORIES.find(c => c.id === idOrLabel || c.label === idOrLabel || c.name === idOrLabel);
  if (defaultFound) return defaultFound.label;

  const lower = idOrLabel.toLowerCase();
  if (lower.includes('preset') || lower.includes('lightroom') || lower.includes('prompt')) {
    return '🎨 Lightroom Presets / AI Prompts Help';
  }
  if (lower.includes('account') || lower.includes('member')) {
    return '💎 Account & Membership Support';
  }
  if (lower.includes('resource') || lower.includes('mod')) {
    return '📥 Custom Resource / Mod Request';
  }
  if (lower.includes('download') || lower.includes('link') || lower.includes('broken')) {
    return '⚠️ Broken Download / Link Issue';
  }
  if (lower.includes('bug') || lower.includes('feedback') || lower.includes('suggest')) {
    return '💡 Bug Report & Feature Suggestion';
  }
  if (lower.includes('general')) {
    return '💬 General Message / Other';
  }
  return idOrLabel;
};

export const cleanSubjectTitle = (subject?: string): string => {
  if (!subject) return '';
  // Remove leading [PRESET_HELP] or [🎨 Lightroom Presets...] tags to get clean title
  const cleaned = subject.replace(/^\[[^\]]+\]\s*/, '').trim();
  return cleaned || subject;
};

