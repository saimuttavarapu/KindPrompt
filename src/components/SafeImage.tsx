import { useState } from 'react';
import { FileText, Globe, MessageSquarePlus, Sparkles } from 'lucide-react';
import { AgentKind } from '../types/agent';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle: string;
  agentKind?: AgentKind;
}

export function SafeImage({
  src,
  alt,
  className = '',
  fallbackTitle,
  agentKind,
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    const gradientClass =
      agentKind === 'prompt_runner'
        ? 'from-teal-500/20 via-emerald-400/15 to-slate-100'
        : agentKind === 'site_readability'
          ? 'from-blue-600/20 via-sky-400/15 to-slate-100'
          : agentKind === 'blog_creator'
            ? 'from-orange-500/20 via-amber-400/15 to-slate-100'
            : 'from-teal-500/20 via-blue-500/15 to-amber-500/15';

    const FallbackIcon =
      agentKind === 'prompt_runner'
        ? MessageSquarePlus
        : agentKind === 'site_readability'
          ? Globe
          : agentKind === 'blog_creator'
            ? FileText
            : Sparkles;

    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br ${gradientClass} p-6 text-center ${className}`}
      >
        <FallbackIcon className="h-7 w-7 text-slate-700" aria-hidden="true" />
        <span className="font-display text-sm font-semibold text-slate-800">
          {fallbackTitle}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
