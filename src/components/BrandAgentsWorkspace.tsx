import { useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  FileText,
  Globe,
  MessageSquarePlus,
  Play,
  RotateCcw,
  Square,
  X,
} from 'lucide-react';
import {
  AGENT_DEFINITIONS,
  AgentExecutionState,
  AgentKind,
  BLOG_ANGLES,
  BRAND_EXAMPLES,
  BlogAngle,
  PROMPT_TONES,
  PromptTone,
} from '../types/agent';
import { MarkdownContent } from './MarkdownContent';
import { SafeImage } from './SafeImage';
import { SpotlightSurface } from './SpotlightSurface';
import heroBrandShowcaseImg from '../assets/images/hero_brand_showcase_1794743712573.jpg';

interface BrandAgentsWorkspaceProps {
  brandName: string;
  onChangeBrandName: (value: string) => void;
  brandUrl: string;
  onChangeBrandUrl: (value: string) => void;
  brandNotes: string;
  onChangeBrandNotes: (value: string) => void;
  brandInputError: string | null;
  promptTone: PromptTone;
  onChangePromptTone: (tone: PromptTone) => void;
  blogAngle: BlogAngle;
  onChangeBlogAngle: (angle: BlogAngle) => void;
  activeAgent: AgentKind;
  onSelectAgent: (agent: AgentKind) => void;
  agentStates: Record<AgentKind, AgentExecutionState>;
  isQueueRunning: boolean;
  onRunSingleAgent: (agent: AgentKind) => void;
  onStopAgent: (agent: AgentKind) => void;
  onRunAllAgents: () => void;
  onStopAllAgents: () => void;
}

const AGENT_THEME_CLASSES: Record<
  AgentKind,
  {
    selectedRing: string;
    indexText: string;
    primaryBtn: string;
    focusRing: string;
    activeTab: string;
    accentText: string;
    topBar: string;
  }
> = {
  prompt_runner: {
    selectedRing: 'border-teal-600 ring-1 ring-teal-600/25',
    indexText: 'text-teal-700',
    primaryBtn: 'bg-teal-700 text-white hover:bg-teal-800 focus-visible:ring-teal-700',
    focusRing: 'focus-visible:ring-teal-700',
    activeTab: 'bg-teal-700 text-white shadow-xs',
    accentText: 'text-teal-700',
    topBar: 'bg-teal-600',
  },
  site_readability: {
    selectedRing: 'border-blue-600 ring-1 ring-blue-600/25',
    indexText: 'text-blue-700',
    primaryBtn: 'bg-blue-700 text-white hover:bg-blue-800 focus-visible:ring-blue-700',
    focusRing: 'focus-visible:ring-blue-700',
    activeTab: 'bg-blue-700 text-white shadow-xs',
    accentText: 'text-blue-700',
    topBar: 'bg-blue-600',
  },
  blog_creator: {
    selectedRing: 'border-orange-600 ring-1 ring-orange-600/25',
    indexText: 'text-orange-700',
    primaryBtn: 'bg-orange-600 text-white hover:bg-orange-700 focus-visible:ring-orange-600',
    focusRing: 'focus-visible:ring-orange-600',
    activeTab: 'bg-orange-600 text-white shadow-xs',
    accentText: 'text-orange-700',
    topBar: 'bg-orange-500',
  },
};

export function BrandAgentsWorkspace({
  brandName,
  onChangeBrandName,
  brandUrl,
  onChangeBrandUrl,
  brandNotes,
  onChangeBrandNotes,
  brandInputError,
  promptTone,
  onChangePromptTone,
  blogAngle,
  onChangeBlogAngle,
  activeAgent,
  onSelectAgent,
  agentStates,
  isQueueRunning,
  onRunSingleAgent,
  onStopAgent,
  onRunAllAgents,
  onStopAllAgents,
}: BrandAgentsWorkspaceProps) {
  const [copiedTarget, setCopiedTarget] = useState<'stage1' | 'output' | null>(null);

  const anyAgentRunning = Object.values(agentStates).some(
    (s) => s.stage === 'preparing' || s.stage === 'streaming'
  );

  const activeDef =
    AGENT_DEFINITIONS.find((d) => d.id === activeAgent) ?? AGENT_DEFINITIONS[0];
  const activeTheme = AGENT_THEME_CLASSES[activeAgent];
  const activeState = agentStates[activeAgent];
  const isActiveRunning =
    activeState.stage === 'preparing' || activeState.stage === 'streaming';

  const handleCopy = async (text: string, target: 'stage1' | 'output') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTarget(target);
      window.setTimeout(() => {
        setCopiedTarget((prev) => (prev === target ? null : prev));
      }, 1800);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleDownloadMarkdown = (filenameBase: string, content: string) => {
    if (!content) return;
    const slug = (filenameBase || 'brand-output')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slug}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getAgentIcon = (id: AgentKind) => {
    const colorClass = AGENT_THEME_CLASSES[id].accentText;
    if (id === 'prompt_runner') {
      return <MessageSquarePlus className={`h-4 w-4 ${colorClass} shrink-0`} aria-hidden="true" />;
    }
    if (id === 'site_readability') {
      return <Globe className={`h-4 w-4 ${colorClass} shrink-0`} aria-hidden="true" />;
    }
    return <FileText className={`h-4 w-4 ${colorClass} shrink-0`} aria-hidden="true" />;
  };

  const formatCardStatus = (state: AgentExecutionState) => {
    if (state.stage === 'preparing') return 'Preparing...';
    if (state.stage === 'streaming') return 'Streaming live';
    if (state.stage === 'complete') {
      return state.elapsedMs ? `Completed · ${state.elapsedMs} ms` : 'Completed';
    }
    if (state.stage === 'error') return 'Error';
    return 'Ready';
  };

  return (
    <section
      id="brand-target"
      className="relative overflow-hidden bg-slate-50"
    >
      {/* Full-bleed Hero Background Image for Content */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[560px] overflow-hidden">
        <SafeImage
          src={heroBrandShowcaseImg}
          alt=""
          fallbackTitle="Brand Positive Impact Studio"
          className="h-full w-full object-cover object-center opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/85 to-slate-50" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-10 pb-14 md:pt-14 md:pb-16 space-y-10">
        {/* Hero Content over Background Image */}
        <SpotlightSurface
          glowColor="rgba(13, 148, 136, 0.14)"
          className="rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-md p-6 md:p-10 shadow-xs"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4 max-w-2xl">
              <p className="text-xs font-semibold tracking-wide text-teal-700">
                Brand Positive Impact Suite · 3 Interactive Agents
              </p>
              <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1] [text-wrap:balance]">
                Make every brand stand out with{' '}
                <span className="bg-gradient-to-r from-teal-700 via-blue-700 to-orange-600 bg-clip-text text-transparent">
                  positive LLM impact.
                </span>
              </h1>
              <p className="max-w-[56ch] text-base leading-relaxed text-slate-700">
                Target any brand or product, then launch three specialized agents: run uplifting LLM prompts, sharpen site readability, and publish positive brand blogs.
              </p>
            </div>

            <div className="flex flex-col items-start gap-4 lg:items-end shrink-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-medium text-slate-700">Quick brand presets:</span>
                {BRAND_EXAMPLES.map((example) => {
                  const isActiveExample =
                    brandName.trim().toLowerCase() === example.brandName.toLowerCase();
                  return (
                    <button
                      key={example.brandName}
                      type="button"
                      disabled={anyAgentRunning || isQueueRunning}
                      onClick={() => {
                        onChangeBrandName(example.brandName);
                        onChangeBrandUrl(example.brandUrl);
                        onChangeBrandNotes(example.brandNotes);
                      }}
                      className={`min-h-[34px] rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-150 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 cursor-pointer ${
                        isActiveExample
                          ? 'border-teal-700 bg-teal-50 text-teal-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {example.brandName}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={isQueueRunning || anyAgentRunning ? onStopAllAgents : onRunAllAgents}
                  className={`inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0 transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer ${
                    isQueueRunning || anyAgentRunning
                      ? 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus-visible:ring-slate-700'
                      : 'bg-gradient-to-r from-teal-700 via-blue-700 to-blue-800 text-white shadow-sm hover:from-teal-800 hover:to-blue-900 focus-visible:ring-teal-700'
                  }`}
                >
                  {isQueueRunning || anyAgentRunning ? (
                    <>
                      <Square className="h-4 w-4 fill-current shrink-0" aria-hidden="true" />
                      <span>Stop Running</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current shrink-0" aria-hidden="true" />
                      <span>Run All 3 Agents</span>
                    </>
                  )}
                </button>

                <a
                  href="#agents"
                  className="inline-flex min-h-[46px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 whitespace-nowrap shrink-0 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                >
                  <span>Explore the 3 Agents</span>
                  <ArrowUpRight className="h-4 w-4 text-slate-500 shrink-0" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </SpotlightSurface>

        {/* Target Brand Input Panel */}
        <SpotlightSurface
          glowColor="rgba(13, 148, 136, 0.08)"
          className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-xs"
        >
          <div className="p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
              <div className="space-y-1.5 md:col-span-5">
                <label
                  htmlFor="brand-name-input"
                  className="block text-sm font-medium text-slate-900"
                >
                  Brand or product name
                </label>
                <div className="relative">
                  <input
                    id="brand-name-input"
                    type="text"
                    value={brandName}
                    onChange={(e) => onChangeBrandName(e.target.value)}
                    disabled={anyAgentRunning || isQueueRunning}
                    maxLength={120}
                    placeholder="e.g., Patagonia, Notion, Oura Ring"
                    className={`w-full min-h-[44px] rounded-lg border bg-white py-2.5 pr-9 pl-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 ${
                      brandInputError
                        ? 'border-red-400 focus:border-red-600 focus:ring-red-600/15'
                        : 'border-slate-200 focus:border-teal-700 focus:ring-teal-700/15'
                    }`}
                  />
                  {brandName && !anyAgentRunning && !isQueueRunning && (
                    <button
                      type="button"
                      onClick={() => onChangeBrandName('')}
                      aria-label="Clear brand name"
                      className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                {brandInputError && (
                  <p role="alert" className="text-xs font-medium text-red-700">
                    {brandInputError}
                  </p>
                )}
              </div>

              <div className="space-y-1.5 md:col-span-4">
                <label
                  htmlFor="brand-url-input"
                  className="flex items-center justify-between text-sm font-medium text-slate-900"
                >
                  <span>Brand website URL</span>
                  <span className="text-xs font-normal text-slate-500">Optional</span>
                </label>
                <input
                  id="brand-url-input"
                  type="url"
                  value={brandUrl}
                  onChange={(e) => onChangeBrandUrl(e.target.value)}
                  disabled={anyAgentRunning || isQueueRunning}
                  placeholder="https://example.com"
                  className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div className="flex items-end md:col-span-3">
                <button
                  type="button"
                  onClick={isQueueRunning || anyAgentRunning ? onStopAllAgents : onRunAllAgents}
                  className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer ${
                    isQueueRunning || anyAgentRunning
                      ? 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus-visible:ring-slate-700'
                      : 'bg-teal-700 text-white hover:bg-teal-800 focus-visible:ring-teal-700'
                  }`}
                >
                  {isQueueRunning || anyAgentRunning ? (
                    <>
                      <Square className="h-3.5 w-3.5 fill-current shrink-0" aria-hidden="true" />
                      <span>Stop Running</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current shrink-0" aria-hidden="true" />
                      <span>Run All 3 Agents</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-1.5 md:col-span-12">
                <label
                  htmlFor="brand-notes-input"
                  className="flex items-center justify-between text-sm font-medium text-slate-900"
                >
                  <span>Product description or existing site copy to optimize</span>
                  <span className="text-xs font-normal text-slate-500">
                    Optional · Used by Site Readability, Prompt, and Blog agents
                  </span>
                </label>
                <textarea
                  id="brand-notes-input"
                  rows={2}
                  value={brandNotes}
                  onChange={(e) => onChangeBrandNotes(e.target.value)}
                  disabled={anyAgentRunning || isQueueRunning}
                  maxLength={2500}
                  placeholder="Paste existing homepage copy for Agent 2 to rewrite for readability, or add key product details..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>
          </div>
        </SpotlightSurface>

        {/* 3-Agent Interactive Image Card Strip */}
        <div id="agents" className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {AGENT_DEFINITIONS.map((def) => {
            const state = agentStates[def.id];
            const theme = AGENT_THEME_CLASSES[def.id];
            const isSelected = activeAgent === def.id;
            const isThisRunning =
              state.stage === 'preparing' || state.stage === 'streaming';

            return (
              <SpotlightSurface
                key={def.id}
                glowColor={def.glowRgba}
                className={`group rounded-xl border bg-white transition-all duration-200 hover:-translate-y-0.5 ${
                  isSelected
                    ? theme.selectedRing
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <div
                      className={`h-1 w-full ${
                        isSelected ? theme.topBar : 'bg-transparent'
                      } transition-colors duration-150`}
                    />

                    {/* Agent Visual Cover */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectAgent(def.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectAgent(def.id);
                        }
                      }}
                      className="cursor-pointer focus-visible:outline-none"
                    >
                      <div className="relative h-40 w-full overflow-hidden border-b border-slate-100">
                        <SafeImage
                          src={def.imageSrc}
                          alt={def.imageAlt}
                          agentKind={def.id}
                          fallbackTitle={def.name}
                          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                        />
                      </div>

                      <div className="space-y-2 p-5 pb-3">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className={`font-mono font-semibold ${theme.indexText} tabular-nums`}>
                            Agent {def.index}
                          </span>
                          <span
                            className={`font-mono tabular-nums ${
                              state.stage === 'error'
                                ? 'text-red-700 font-medium'
                                : state.stage === 'complete'
                                  ? `${theme.accentText} font-medium`
                                  : 'text-slate-500'
                            }`}
                          >
                            {formatCardStatus(state)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {getAgentIcon(def.id)}
                          <h2 className="font-display text-base font-semibold text-slate-900">
                            {def.name}
                          </h2>
                        </div>

                        <p className="text-sm leading-relaxed text-slate-600">
                          {def.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectAgent(def.id);
                        if (isThisRunning) {
                          onStopAgent(def.id);
                        } else {
                          onRunSingleAgent(def.id);
                        }
                      }}
                      disabled={!isThisRunning && isQueueRunning}
                      className={`inline-flex min-h-[38px] items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isThisRunning
                          ? 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus-visible:ring-slate-700'
                          : isSelected
                            ? theme.primaryBtn
                            : 'border border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-700'
                      }`}
                    >
                      {isThisRunning ? (
                        <>
                          <Square className="h-3 w-3 fill-current shrink-0" aria-hidden="true" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 fill-current shrink-0" aria-hidden="true" />
                          <span>{def.actionLabel}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectAgent(def.id)}
                      className={`text-xs font-medium whitespace-nowrap shrink-0 hover:underline underline-offset-4 cursor-pointer ${
                        isSelected ? theme.accentText : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isSelected ? 'Viewing output' : 'View output'}
                    </button>
                  </div>
                </div>
              </SpotlightSurface>
            );
          })}
        </div>

        {/* Focused Agent Output Panel with Active Background Image */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <SafeImage
              src={activeDef.imageSrc}
              alt=""
              agentKind={activeAgent}
              fallbackTitle={activeDef.name}
              className="h-full w-full object-cover opacity-15"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/90 to-white/80" />
          </div>
          <div className={`relative z-10 h-1 w-full ${activeTheme.topBar} transition-colors duration-200`} />
          <div className="relative z-10 p-6 md:p-8 space-y-6">
            {/* Panel Header & Agent-Specific Control Bar */}
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className={`font-mono font-semibold ${activeTheme.indexText} tabular-nums`}>
                    Agent {activeDef.index}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeDef.name}</span>
                  {brandName.trim() && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-800">{brandName.trim()}</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-slate-600">{activeDef.description}</p>
              </div>

              {/* Agent-specific options */}
              <div className="flex flex-wrap items-center gap-3">
                {activeAgent === 'prompt_runner' && (
                  <div
                    role="group"
                    aria-label="Positive prompt angle"
                    className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
                  >
                    {PROMPT_TONES.map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        disabled={isActiveRunning}
                        onClick={() => onChangePromptTone(tone)}
                        aria-pressed={promptTone === tone}
                        className={`min-h-[32px] rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50 ${
                          promptTone === tone
                            ? activeTheme.activeTab
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                )}

                {activeAgent === 'blog_creator' && (
                  <div
                    role="group"
                    aria-label="Positive blog angle"
                    className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
                  >
                    {BLOG_ANGLES.map((angle) => (
                      <button
                        key={angle}
                        type="button"
                        disabled={isActiveRunning}
                        onClick={() => onChangeBlogAngle(angle)}
                        aria-pressed={blogAngle === angle}
                        className={`min-h-[32px] rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50 ${
                          blogAngle === angle
                            ? activeTheme.activeTab
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {angle}
                      </button>
                    ))}
                  </div>
                )}

                {activeAgent === 'site_readability' && (
                  <p className="text-xs text-slate-600">
                    {brandUrl.trim()
                      ? `Inspecting URL: ${brandUrl.trim()}`
                      : brandNotes.trim()
                        ? 'Optimizing submitted site copy'
                        : 'Generates clarity audit + high-readability page rewrite'}
                  </p>
                )}
              </div>
            </div>

            {/* Idle State */}
            {activeState.stage === 'idle' &&
              !activeState.stage1 &&
              !activeState.errorMessage && (
                <div className="flex flex-col items-start justify-between gap-4 py-8 sm:flex-row sm:items-center">
                  <div className="space-y-1.5 max-w-xl">
                    <h3 className="font-display text-lg font-semibold text-slate-900">
                      {activeDef.name} is ready
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {brandName.trim()
                        ? `Click "${activeDef.actionLabel}" to run this agent for ${brandName.trim()}, or click "Run All 3 Agents" to execute the full brand workflow.`
                        : `Enter a brand or product name above, then run ${activeDef.name} or all three agents together.`}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isQueueRunning}
                    onClick={() => onRunSingleAgent(activeAgent)}
                    className={`inline-flex min-h-[42px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 cursor-pointer ${activeTheme.primaryBtn}`}
                  >
                    <Play className="h-3.5 w-3.5 fill-current shrink-0" aria-hidden="true" />
                    <span>{activeDef.actionLabel}</span>
                  </button>
                </div>
              )}

            {/* Error Banner */}
            {activeState.errorMessage && (
              <div
                role="alert"
                className="flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="font-medium">{activeDef.name} did not complete</p>
                    <p className="text-red-800">{activeState.errorMessage}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRunSingleAgent(activeAgent)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-900 whitespace-nowrap shrink-0 hover:bg-red-100/60 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Active / Populated Stage 1 + Stage 2 */}
            {(activeState.stage !== 'idle' || activeState.stage1 || activeState.output) && (
              <div className="space-y-6">
                {/* Stage 1 */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className={`font-medium ${activeTheme.accentText}`}>
                        {activeDef.stage1Label}
                      </span>
                      {activeState.stage1 && activeState.stage1.preparedMs > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {activeState.stage1.preparedMs} ms
                          </span>
                        </>
                      )}
                    </div>

                    {activeState.stage1?.content && (
                      <button
                        type="button"
                        onClick={() => handleCopy(activeState.stage1?.content ?? '', 'stage1')}
                        className="inline-flex min-h-[32px] items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                      >
                        {copiedTarget === 'stage1' ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {activeState.stage === 'preparing' && !activeState.stage1 ? (
                    <div className="space-y-2 py-1" aria-busy="true">
                      <p className="text-xs text-slate-500">{activeState.statusMessage}</p>
                      <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
                      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                    </div>
                  ) : activeState.stage1 ? (
                    <div className="space-y-1.5">
                      <h3 className="font-display text-lg font-semibold text-slate-900">
                        {activeState.stage1.title}
                      </h3>
                      <p className="text-[15px] leading-relaxed text-slate-800">
                        {activeState.stage1.content}
                      </p>
                      <p className="text-xs text-slate-500">
                        {activeState.stage1.subtitle}
                      </p>
                    </div>
                  ) : null}
                </div>

                <hr className="border-slate-200" />

                {/* Stage 2 */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className={`font-medium ${activeTheme.accentText}`}>
                        {activeDef.stage2Label}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {activeState.stage === 'streaming'
                          ? 'Streaming live'
                          : activeState.stage === 'complete'
                            ? 'Completed'
                            : activeState.stage === 'preparing'
                              ? 'Preparing'
                              : activeState.stage === 'error'
                                ? 'Failed'
                                : 'Ready'}
                      </span>
                      {activeState.elapsedMs !== null && activeState.elapsedMs > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {activeState.elapsedMs} ms total
                          </span>
                        </>
                      )}
                    </div>

                    {activeState.output && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(activeState.output, 'output')}
                          className="inline-flex min-h-[32px] items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                        >
                          {copiedTarget === 'output' ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Copy output</span>
                            </>
                          )}
                        </button>

                        {(activeAgent === 'site_readability' || activeAgent === 'blog_creator') && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadMarkdown(
                                `${brandName}-${activeAgent}`,
                                activeState.output
                              )
                            }
                            className="inline-flex min-h-[32px] items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Download .md</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {!activeState.output && activeState.stage === 'preparing' ? (
                    <div className="space-y-2.5 py-1" aria-busy="true">
                      {activeState.statusMessage && (
                        <p className="text-xs text-slate-500">{activeState.statusMessage}</p>
                      )}
                      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                      <div className="h-4 w-11/12 animate-pulse rounded bg-slate-100" />
                      <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
                    </div>
                  ) : activeState.output ? (
                    <div className="pt-1">
                      <MarkdownContent content={activeState.output} />
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
