import { Play, Square } from 'lucide-react';

interface HeaderProps {
  isQueueRunning: boolean;
  hasAnyRunning: boolean;
  onRunAll: () => void;
  onStopAll: () => void;
}

export function Header({
  isQueueRunning,
  hasAnyRunning,
  onRunAll,
  onStopAll,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
      <div
        aria-hidden="true"
        className="h-[3px] w-full bg-gradient-to-r from-teal-600 via-blue-600 to-orange-500"
      />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-3.5">
        <a
          href="#brand-target"
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
        >
          KindPrompt
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            href="#brand-target"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-teal-700 hover:underline underline-offset-4 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            Brand Target
          </a>
          <a
            href="#agents"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-blue-700 hover:underline underline-offset-4 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            Three Agents
          </a>
          <a
            href="#analytics"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-orange-700 hover:underline underline-offset-4 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            Analytics
          </a>
          <a
            href="#history"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-slate-900 hover:underline underline-offset-4 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            Activity Log
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={isQueueRunning || hasAnyRunning ? onStopAll : onRunAll}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap shrink-0 transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer ${
              isQueueRunning || hasAnyRunning
                ? 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus-visible:ring-slate-700'
                : 'bg-gradient-to-r from-teal-700 to-blue-700 text-white shadow-xs hover:from-teal-800 hover:to-blue-800 focus-visible:ring-teal-700'
            }`}
          >
            {isQueueRunning || hasAnyRunning ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current shrink-0" aria-hidden="true" />
                <span>Stop Agents</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current shrink-0" aria-hidden="true" />
                <span>Run All 3 Agents</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
