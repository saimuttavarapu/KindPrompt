import { useMemo, useState } from 'react';
import { Check, Copy, Download, RotateCcw, Search, Trash2 } from 'lucide-react';
import { AGENT_DEFINITIONS, AgentKind, BrandRunRecord } from '../types/agent';

interface RunHistoryProps {
  runs: BrandRunRecord[];
  isRunning: boolean;
  onRerunRecord: (run: BrandRunRecord) => void;
  onDeleteRun: (id: string) => void;
  onClearAll: () => void;
  onRunAllAgents: () => void;
}

export function RunHistory({
  runs,
  isRunning,
  onRerunRecord,
  onDeleteRun,
  onClearAll,
  onRunAllAgents,
}: RunHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState<'All' | AgentKind>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const filteredRuns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return runs.filter((run) => {
      const matchesAgent = agentFilter === 'All' || run.agentType === agentFilter;
      if (!matchesAgent) return false;
      if (!query) return true;
      return (
        run.brandName.toLowerCase().includes(query) ||
        run.title.toLowerCase().includes(query) ||
        run.stage1Content.toLowerCase().includes(query) ||
        run.output.toLowerCase().includes(query)
      );
    });
  }, [runs, searchQuery, agentFilter]);

  const getAgentLabel = (agentType: AgentKind) =>
    AGENT_DEFINITIONS.find((d) => d.id === agentType)?.shortName ?? agentType;

  const handleCopy = async (run: BrandRunRecord) => {
    try {
      await navigator.clipboard.writeText(`${run.title}\n\n${run.output}`);
      setCopiedId(run.id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === run.id ? null : prev));
      }, 1800);
    } catch {
      // Clipboard unavailable
    }
  };

  const handleDownload = (run: BrandRunRecord) => {
    const slug = `${run.brandName}-${run.agentType}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const blob = new Blob([run.output], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slug}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <section id="history" className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Brand Impact Log
            </h2>
            <p className="text-sm text-slate-600">
              Saved outputs from the Positive Prompt, Site Readability, and Positive Blog agents.
            </p>
          </div>

          {runs.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex min-h-[38px] items-center gap-1.5 self-start rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-600 whitespace-nowrap shrink-0 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 cursor-pointer sm:self-auto"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Clear Log</span>
            </button>
          )}
        </div>

        {runs.length > 0 && (
          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              role="group"
              aria-label="Filter log by agent"
              className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1"
            >
              <button
                type="button"
                onClick={() => setAgentFilter('All')}
                aria-pressed={agentFilter === 'All'}
                className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  agentFilter === 'All'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({runs.length})
              </button>
              {AGENT_DEFINITIONS.map((def) => (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => setAgentFilter(def.id)}
                  aria-pressed={agentFilter === def.id}
                  className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    agentFilter === def.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {def.shortName}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-72">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search brand or outputs..."
                aria-label="Search brand impact log"
                className="w-full min-h-[40px] rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
              />
            </div>
          </div>
        )}

        {runs.length === 0 ? (
          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-6 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">No brand agent runs saved yet</p>
              <p className="text-sm text-slate-600">
                Run any of the three agents above to store positive prompts, readability rewrites, and brand blogs here.
              </p>
            </div>
            <button
              type="button"
              onClick={onRunAllAgents}
              disabled={isRunning}
              className="inline-flex min-h-[40px] items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
            >
              Run All 3 Agents
            </button>
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
            No saved agent runs match your current filter.
          </div>
        ) : (
          <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
            {filteredRuns.map((run) => {
              const isExpanded = Boolean(expandedIds[run.id]);
              const isLong = run.output.length > 360;
              const previewText =
                isExpanded || !isLong ? run.output : `${run.output.slice(0, 360).trim()}...`;

              return (
                <article key={run.id} className="py-6 first:pt-5 last:pb-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2 max-w-[72ch]">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span
                          className={`font-semibold ${
                            run.agentType === 'prompt_runner'
                              ? 'text-teal-700'
                              : run.agentType === 'site_readability'
                                ? 'text-blue-700'
                                : 'text-orange-700'
                          }`}
                        >
                          {getAgentLabel(run.agentType)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-slate-800">{run.brandName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{run.optionLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatTimestamp(run.createdAt)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{run.totalMs} ms</span>
                      </div>

                      <h3 className="font-display text-base font-semibold text-slate-900">
                        {run.title}
                      </h3>

                      {run.agentType === 'prompt_runner' && (
                        <p className="text-sm font-medium leading-relaxed text-slate-800">
                          &ldquo;{run.stage1Content}&rdquo;
                        </p>
                      )}

                      <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                        {previewText}
                      </p>

                      {isLong && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedIds((prev) => ({
                              ...prev,
                              [run.id]: !isExpanded,
                            }))
                          }
                          className="text-xs font-medium text-teal-700 hover:underline underline-offset-4 cursor-pointer"
                        >
                          {isExpanded ? 'Show less' : 'Read full output'}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRerunRecord(run)}
                        disabled={isRunning}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>Re-run</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(run)}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                      >
                        {copiedId === run.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-teal-700 shrink-0" aria-hidden="true" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {(run.agentType === 'site_readability' || run.agentType === 'blog_creator') && (
                        <button
                          type="button"
                          onClick={() => handleDownload(run)}
                          aria-label={`Download ${run.title}`}
                          className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onDeleteRun(run.id)}
                        aria-label={`Delete ${run.title}`}
                        className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
