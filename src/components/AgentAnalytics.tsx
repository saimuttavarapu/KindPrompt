import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Play } from 'lucide-react';
import { AGENT_DEFINITIONS, AgentKind, BrandRunRecord } from '../types/agent';

interface AgentAnalyticsProps {
  runs: BrandRunRecord[];
  isRunning: boolean;
  onRunAllAgents: () => void;
}

const AGENT_COLORS: Record<AgentKind, string> = {
  prompt_runner: '#0d9488', // teal-600
  site_readability: '#2563eb', // blue-600
  blog_creator: '#ea580c', // orange-600
};

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0 ms';
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)} s`;
  }
  return `${Math.round(ms)} ms`;
}

export function AgentAnalytics({
  runs,
  isRunning,
  onRunAllAgents,
}: AgentAnalyticsProps) {
  const [latencyView, setLatencyView] = useState<'by_agent' | 'trend'>('by_agent');

  const recentRuns = useMemo(() => runs.slice(0, 60), [runs]);

  const analytics = useMemo(() => {
    const totalCount = recentRuns.length;
    const totalDuration = recentRuns.reduce((sum, r) => sum + r.totalMs, 0);
    const overallAvgMs = totalCount > 0 ? Math.round(totalDuration / totalCount) : 0;
    const fastestMs =
      totalCount > 0 ? Math.min(...recentRuns.map((r) => r.totalMs)) : 0;

    const perAgent = AGENT_DEFINITIONS.map((def) => {
      const matching = recentRuns.filter((r) => r.agentType === def.id);
      const count = matching.length;
      const avgMs =
        count > 0
          ? Math.round(matching.reduce((sum, r) => sum + r.totalMs, 0) / count)
          : 0;
      const sharePct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;

      return {
        agentType: def.id,
        name: def.shortName,
        count,
        avgMs,
        sharePct,
        color: AGENT_COLORS[def.id],
      };
    });

    const distributionData = perAgent.filter((item) => item.count > 0);

    const mostUsed = [...perAgent].sort((a, b) => b.count - a.count)[0];

    // Chronological order (oldest -> newest) for the rolling trend chart
    const chronological = [...recentRuns].reverse();
    let runningSum = 0;
    const trendData = chronological.map((run, idx) => {
      runningSum += run.totalMs;
      const rollingAvgMs = Math.round(runningSum / (idx + 1));
      const agentLabel =
        AGENT_DEFINITIONS.find((d) => d.id === run.agentType)?.shortName ??
        run.agentType;

      return {
        index: idx + 1,
        label: `#${idx + 1}`,
        brandName: run.brandName,
        agentLabel,
        totalMs: run.totalMs,
        rollingAvgMs,
      };
    });

    return {
      totalCount,
      overallAvgMs,
      fastestMs,
      mostUsed: mostUsed && mostUsed.count > 0 ? mostUsed : null,
      perAgent,
      distributionData,
      trendData,
    };
  }, [recentRuns]);

  return (
    <section id="analytics" className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-14 space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Agent Activity &amp; Response Times
            </h2>
            <p className="text-sm text-slate-600">
              Distribution of agent types run and average response times across the last{' '}
              <span className="font-mono tabular-nums">60</span> records.
            </p>
          </div>
          <p className="text-xs font-mono text-slate-500 tabular-nums">
            Sample: {analytics.totalCount} / 60 records
          </p>
        </div>

        {/* Summary Metrics Row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-1">
            <p className="text-xs font-medium text-slate-500">Runs analyzed</p>
            <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {analytics.totalCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-1">
            <p className="text-xs font-medium text-slate-500">Overall avg response</p>
            <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {analytics.totalCount > 0 ? formatDuration(analytics.overallAvgMs) : '—'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-1">
            <p className="text-xs font-medium text-slate-500">Fastest run</p>
            <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {analytics.totalCount > 0 ? formatDuration(analytics.fastestMs) : '—'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-1">
            <p className="text-xs font-medium text-slate-500">Most run agent</p>
            <p className="font-display text-lg font-semibold text-slate-900 truncate">
              {analytics.mostUsed ? analytics.mostUsed.name : '—'}
            </p>
          </div>
        </div>

        {analytics.totalCount === 0 ? (
          <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">
                No agent runs available to chart yet
              </p>
              <p className="text-sm text-slate-600">
                Run any of the three agents above to visualize run distribution and average response times.
              </p>
            </div>
            <button
              type="button"
              onClick={onRunAllAgents}
              disabled={isRunning}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-teal-800 disabled:opacity-50 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current shrink-0" aria-hidden="true" />
              <span>Run All 3 Agents</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Chart: Distribution of Agent Types Run */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 space-y-5">
              <div className="space-y-1">
                <h3 className="font-display text-base font-semibold text-slate-900">
                  Distribution of agent types
                </h3>
                <p className="text-xs text-slate-500">
                  Share of runs by agent across the last {analytics.totalCount} records
                </p>
              </div>

              <div className="h-[220px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={analytics.distributionData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={86}
                      paddingAngle={analytics.distributionData.length > 1 ? 3 : 0}
                      stroke="none"
                    >
                      {analytics.distributionData.map((entry) => (
                        <Cell key={entry.agentType} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} runs`, String(name)]}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#0f172a',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Clean Tabular Breakdown (no pill badges) */}
              <div className="divide-y divide-slate-100 border-t border-slate-200 pt-2">
                {analytics.perAgent.map((row) => (
                  <div
                    key={row.agentType}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-xs"
                        style={{ backgroundColor: row.color }}
                        aria-hidden="true"
                      />
                      <span className="font-medium text-slate-800 truncate">
                        {row.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs text-slate-600 tabular-nums shrink-0">
                      <span>{row.count} runs</span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="w-9 text-right text-slate-900 font-medium">
                        {row.sharePct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Chart: Average Response Times */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    Average response time
                  </h3>
                  <p className="text-xs text-slate-500">
                    {latencyView === 'by_agent'
                      ? 'Mean total latency (ms) per agent type'
                      : 'Run latency and cumulative rolling average across recent records'}
                  </p>
                </div>

                <div
                  role="group"
                  aria-label="Response time chart view"
                  className="flex items-center gap-1 self-start rounded-lg border border-slate-200 bg-slate-50 p-1 sm:self-auto"
                >
                  <button
                    type="button"
                    onClick={() => setLatencyView('by_agent')}
                    aria-pressed={latencyView === 'by_agent'}
                    className={`min-h-[32px] rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      latencyView === 'by_agent'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    By Agent
                  </button>
                  <button
                    type="button"
                    onClick={() => setLatencyView('trend')}
                    aria-pressed={latencyView === 'trend'}
                    className={`min-h-[32px] rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      latencyView === 'trend'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Last 60 Trend
                  </button>
                </div>
              </div>

              <div className="h-[270px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  {latencyView === 'by_agent' ? (
                    <BarChart
                      data={analytics.perAgent}
                      margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: '#475569' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v} ms`}
                        width={68}
                      />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        formatter={(value, _name, item) => [
                          `${Number(value).toLocaleString()} ms avg (${item?.payload?.count ?? 0} runs)`,
                          'Average latency',
                        ]}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#0f172a',
                        }}
                      />
                      <Bar dataKey="avgMs" radius={[6, 6, 0, 0]} maxBarSize={64}>
                        {analytics.perAgent.map((entry) => (
                          <Cell key={entry.agentType} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <AreaChart
                      data={analytics.trendData}
                      margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                    >
                      <defs>
                        <linearGradient id="latencyFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f766e" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#0f766e" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v} ms`}
                        width={68}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          `${Number(value).toLocaleString()} ms`,
                          name === 'rollingAvgMs' ? 'Rolling Avg' : 'Run Latency',
                        ]}
                        labelFormatter={(_label, payload) => {
                          const row = payload?.[0]?.payload;
                          if (!row) return '';
                          return `${row.label} · ${row.agentLabel} (${row.brandName})`;
                        }}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#0f172a',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="totalMs"
                        stroke="#0f766e"
                        strokeWidth={2}
                        fill="url(#latencyFill)"
                        name="totalMs"
                      />
                      <Area
                        type="monotone"
                        dataKey="rollingAvgMs"
                        stroke="#0284c7"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        fill="none"
                        name="rollingAvgMs"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Per-Agent Latency Footer Summary */}
              <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-4 text-xs">
                {analytics.perAgent.map((item) => (
                  <div key={item.agentType} className="space-y-0.5">
                    <p className="text-slate-500 truncate">{item.name}</p>
                    <p className="font-mono font-medium text-slate-900 tabular-nums">
                      {item.count > 0 ? formatDuration(item.avgMs) : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
