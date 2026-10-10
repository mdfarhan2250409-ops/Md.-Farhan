import React from 'react';
import { Check, X, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  bgColor: string;
  barColor: string;
  glowColor: string;
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isStrongEnough: boolean;
}

export function evaluatePasswordStrength(pwd: string): PasswordStrengthResult {
  if (!pwd) {
    return {
      score: 0,
      label: 'Very Weak',
      color: 'text-slate-500',
      bgColor: 'bg-slate-800',
      barColor: 'bg-slate-700',
      glowColor: 'none',
      hasMinLength: false,
      hasUpper: false,
      hasLower: false,
      hasNumber: false,
      hasSpecial: false,
      isStrongEnough: false
    };
  }

  const hasMinLength = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd);

  let rawScore = 0;
  if (pwd.length >= 6) rawScore += 1;
  if (hasMinLength) rawScore += 1;
  if (hasUpper && hasLower) rawScore += 1;
  if (hasNumber) rawScore += 1;
  if (hasSpecial) rawScore += 1;

  // Normalize to 1-4
  let score = 1;
  if (pwd.length < 6) {
    score = 1;
  } else if (rawScore <= 2) {
    score = 1; // Weak
  } else if (rawScore === 3) {
    score = 2; // Fair
  } else if (rawScore === 4) {
    score = 3; // Good
  } else if (rawScore >= 5) {
    score = 4; // Strong
  }

  switch (score) {
    case 1:
      return {
        score: 1,
        label: pwd.length < 6 ? 'Very Weak' : 'Weak',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/20',
        barColor: 'bg-rose-500',
        glowColor: 'rgba(244,63,94,0.4)',
        hasMinLength,
        hasUpper,
        hasLower,
        hasNumber,
        hasSpecial,
        isStrongEnough: false
      };
    case 2:
      return {
        score: 2,
        label: 'Fair',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20',
        barColor: 'bg-amber-500',
        glowColor: 'rgba(245,158,11,0.4)',
        hasMinLength,
        hasUpper,
        hasLower,
        hasNumber,
        hasSpecial,
        isStrongEnough: false
      };
    case 3:
      return {
        score: 3,
        label: 'Good',
        color: 'text-cyan-300',
        bgColor: 'bg-cyan-500/20',
        barColor: 'bg-[#5DE2E7]',
        glowColor: 'rgba(93,226,231,0.4)',
        hasMinLength,
        hasUpper,
        hasLower,
        hasNumber,
        hasSpecial,
        isStrongEnough: true
      };
    case 4:
    default:
      return {
        score: 4,
        label: 'Strong',
        color: 'text-emerald-300',
        bgColor: 'bg-emerald-500/20',
        barColor: 'bg-emerald-400',
        glowColor: 'rgba(52,211,153,0.5)',
        hasMinLength,
        hasUpper,
        hasLower,
        hasNumber,
        hasSpecial,
        isStrongEnough: true
      };
  }
}

interface PasswordStrengthIndicatorProps {
  password: string;
  confirmPassword?: string;
  showRequirements?: boolean;
  compact?: boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  confirmPassword,
  showRequirements = true,
  compact = false
}) => {
  if (!password && confirmPassword === undefined) {
    return null;
  }

  const evaluation = evaluatePasswordStrength(password);
  const { score, label, color, barColor, glowColor, hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial } = evaluation;

  const isMatching = confirmPassword !== undefined && confirmPassword.length > 0 && password === confirmPassword;
  const isMismatch = confirmPassword !== undefined && confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="mt-2 space-y-2 select-none">
      {/* Visual Strength Bar & Label */}
      {password && (
        <div className="space-y-1.5 bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              {score >= 3 ? (
                <ShieldCheck className={`w-3.5 h-3.5 ${color}`} />
              ) : score >= 2 ? (
                <Shield className={`w-3.5 h-3.5 ${color}`} />
              ) : (
                <ShieldAlert className={`w-3.5 h-3.5 ${color}`} />
              )}
              <span className="text-[11px] font-medium text-slate-400">Password Strength:</span>
            </div>
            <span className={`text-[11px] font-bold ${color} uppercase tracking-wider flex items-center gap-1`}>
              {label}
            </span>
          </div>

          {/* 4 Segmented Progress Bar */}
          <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
            {[1, 2, 3, 4].map((step) => {
              const isFilled = score >= step;
              return (
                <div
                  key={step}
                  className={`h-full rounded-full transition-all duration-300 ${
                    isFilled ? barColor : 'bg-slate-800'
                  }`}
                  style={{
                    boxShadow: isFilled ? `0 0 8px ${glowColor}` : 'none'
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Live Requirement Badges */}
      {showRequirements && password && !compact && (
        <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[10px]">
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
              hasMinLength
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-950/40 border-white/5 text-slate-400'
            }`}
          >
            {hasMinLength ? (
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0 mx-0.5" />
            )}
            <span className="truncate">8+ characters</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
              hasUpper && hasLower
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-950/40 border-white/5 text-slate-400'
            }`}
          >
            {hasUpper && hasLower ? (
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0 mx-0.5" />
            )}
            <span className="truncate">Upper & Lower case</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
              hasNumber
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-950/40 border-white/5 text-slate-400'
            }`}
          >
            {hasNumber ? (
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0 mx-0.5" />
            )}
            <span className="truncate">At least 1 number</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
              hasSpecial
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-950/40 border-white/5 text-slate-400'
            }`}
          >
            {hasSpecial ? (
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0 mx-0.5" />
            )}
            <span className="truncate">Special symbol (!@#$)</span>
          </div>
        </div>
      )}

      {/* Confirm Password Match Indicator */}
      {confirmPassword !== undefined && confirmPassword.length > 0 && (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
            isMatching
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : isMismatch
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              : 'bg-slate-950/40 border-white/5 text-slate-400'
          }`}
        >
          {isMatching ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Passwords match</span>
            </>
          ) : (
            <>
              <X className="w-3.5 h-3.5 text-rose-400" />
              <span>Passwords do not match</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
