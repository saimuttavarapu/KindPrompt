/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AgentAnalytics } from './components/AgentAnalytics';
import { BrandAgentsWorkspace } from './components/BrandAgentsWorkspace';
import { Header } from './components/Header';
import { RunHistory } from './components/RunHistory';
import { WorkflowSection } from './components/WorkflowSection';
import {
  AgentExecutionState,
  AgentKind,
  AgentStage1Payload,
  BlogAngle,
  BrandRunRecord,
  PromptTone,
  createInitialExecutionState,
} from './types/agent';

const STORAGE_KEY = 'kindprompt_brand_runs_v2';

function loadSavedRuns(): BrandRunRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BrandRunRecord[]) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [brandName, setBrandName] = useState('Patagonia');
  const [brandUrl, setBrandUrl] = useState('https://www.patagonia.com');
  const [brandNotes, setBrandNotes] = useState(
    'Outdoor technical apparel built for durability and environmental stewardship.'
  );
  const [brandInputError, setBrandInputError] = useState<string | null>(null);

  const [promptTone, setPromptTone] = useState<PromptTone>('Value & Trust');
  const [blogAngle, setBlogAngle] = useState<BlogAngle>('Customer Story');
  const [activeAgent, setActiveAgent] = useState<AgentKind>('prompt_runner');
  const [isQueueRunning, setIsQueueRunning] = useState(false);

  const [agentStates, setAgentStates] = useState<Record<AgentKind, AgentExecutionState>>({
    prompt_runner: createInitialExecutionState(),
    site_readability: createInitialExecutionState(),
    blog_creator: createInitialExecutionState(),
  });

  const [runs, setRuns] = useState<BrandRunRecord[]>(loadSavedRuns);

  const controllersRef = useRef<Partial<Record<AgentKind, AbortController>>>({});
  const queueAbortRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
    } catch {
      // Ignore storage quota errors
    }
  }, [runs]);

  useEffect(() => {
    return () => {
      Object.values(controllersRef.current).forEach((c) => c?.abort());
    };
  }, []);

  const updateAgentState = useCallback(
    (agentType: AgentKind, updater: (prev: AgentExecutionState) => AgentExecutionState) => {
      setAgentStates((prev) => ({
        ...prev,
        [agentType]: updater(prev[agentType]),
      }));
    },
    []
  );

  const runAgent = useCallback(
    async (
      agentType: AgentKind,
      overrides?: {
        brandName?: string;
        brandUrl?: string;
        brandNotes?: string;
        promptTone?: PromptTone;
        blogAngle?: BlogAngle;
        customPrompt?: string;
        customTitle?: string;
      }
    ): Promise<boolean> => {
      const targetBrand = (overrides?.brandName ?? brandName).trim();
      if (!targetBrand) {
        setBrandInputError('Please enter a brand or product name to run an agent.');
        document.getElementById('brand-name-input')?.focus();
        return false;
      }
      setBrandInputError(null);

      controllersRef.current[agentType]?.abort();
      const controller = new AbortController();
      controllersRef.current[agentType] = controller;

      const targetUrl = (overrides?.brandUrl ?? brandUrl).trim();
      const targetNotes = (overrides?.brandNotes ?? brandNotes).trim();
      const targetTone = overrides?.promptTone ?? promptTone;
      const targetAngle = overrides?.blogAngle ?? blogAngle;

      updateAgentState(agentType, () => ({
        stage: 'preparing',
        statusMessage: 'Starting agent...',
        stage1: null,
        output: '',
        errorMessage: null,
        elapsedMs: null,
      }));

      let latestStage1: AgentStage1Payload | null = null;
      let accumulatedOutput = '';
      let streamCompleted = false;

      try {
        const response = await fetch('/api/agent/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentType,
            brandName: targetBrand,
            brandUrl: targetUrl || undefined,
            brandNotes: targetNotes || undefined,
            promptTone: targetTone,
            blogAngle: targetAngle,
            customPrompt: overrides?.customPrompt,
            customTitle: overrides?.customTitle,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errMsg = `Request failed with status ${response.status}`;
          try {
            const parsedErr = (await response.json()) as { error?: string };
            if (parsedErr?.error) errMsg = parsedErr.error;
          } catch {
            const text = await response.text();
            if (text) errMsg = text;
          }
          throw new Error(errMsg);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Streaming response body is unavailable.');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        const processBlock = (block: string) => {
          const lines = block.split(/\r?\n/);
          let eventName = 'message';
          const dataLines: string[] = [];

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).trimStart());
            }
          }

          if (dataLines.length === 0) return;
          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
          } catch {
            return;
          }

          if (eventName === 'agent:preparing') {
            updateAgentState(agentType, (prev) => ({
              ...prev,
              stage: 'preparing',
              statusMessage:
                typeof payload.message === 'string' ? payload.message : prev.statusMessage,
            }));
          } else if (eventName === 'agent:stage1_ready') {
            const s1: AgentStage1Payload = {
              label: String(payload.label ?? ''),
              title: String(payload.title ?? targetBrand),
              content: String(payload.content ?? ''),
              subtitle: String(payload.subtitle ?? ''),
              preparedMs: Number(payload.preparedMs ?? 0),
            };
            latestStage1 = s1;
            updateAgentState(agentType, (prev) => ({
              ...prev,
              stage1: s1,
              stage: 'streaming',
              statusMessage: 'Generating output...',
            }));
          } else if (eventName === 'agent:chunk') {
            const chunkText = typeof payload.text === 'string' ? payload.text : '';
            if (chunkText) {
              accumulatedOutput += chunkText;
              updateAgentState(agentType, (prev) => ({
                ...prev,
                stage: 'streaming',
                output: accumulatedOutput,
                statusMessage: 'Streaming output...',
              }));
            }
          } else if (eventName === 'agent:complete') {
            streamCompleted = true;
            const totalMs = Number(payload.totalMs ?? 0);
            updateAgentState(agentType, (prev) => ({
              ...prev,
              stage: 'complete',
              elapsedMs: totalMs,
              statusMessage: '',
            }));

            if (latestStage1 && accumulatedOutput.trim()) {
              const optionLabel =
                agentType === 'prompt_runner'
                  ? targetTone
                  : agentType === 'blog_creator'
                    ? targetAngle
                    : targetUrl
                      ? 'URL + Readability Audit'
                      : 'Site Copy Readability';

              const record: BrandRunRecord = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                agentType,
                brandName: targetBrand,
                brandUrl: targetUrl || undefined,
                brandNotes: targetNotes || undefined,
                optionLabel,
                title: latestStage1.title,
                stage1Content: latestStage1.content,
                output: accumulatedOutput.trim(),
                totalMs,
                createdAt: new Date().toISOString(),
              };

              setRuns((prev) => [record, ...prev].slice(0, 60));
            }
          } else if (eventName === 'agent:error') {
            streamCompleted = true;
            const msg =
              typeof payload.message === 'string'
                ? payload.message
                : 'The agent encountered an error.';
            updateAgentState(agentType, (prev) => ({
              ...prev,
              stage: 'error',
              errorMessage: msg,
              statusMessage: '',
            }));
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const blocks = buffer.split(/\r?\n\r?\n/);
          buffer = blocks.pop() ?? '';
          for (const block of blocks) {
            if (block.trim()) {
              processBlock(block);
            }
          }
        }

        if (buffer.trim()) {
          processBlock(buffer);
        }

        if (!streamCompleted) {
          if (accumulatedOutput.trim()) {
            updateAgentState(agentType, (prev) => ({
              ...prev,
              stage: 'complete',
              statusMessage: '',
            }));
          } else {
            updateAgentState(agentType, (prev) => ({
              ...prev,
              stage: 'error',
              errorMessage:
                'The agent stream ended before returning a response. Please try again.',
              statusMessage: '',
            }));
            return false;
          }
        }

        return true;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          updateAgentState(agentType, (prev) => ({
            ...prev,
            stage: prev.output ? 'complete' : 'idle',
            statusMessage: '',
          }));
          return false;
        }
        const message =
          err instanceof Error ? err.message : 'Unable to reach the agent server.';
        updateAgentState(agentType, (prev) => ({
          ...prev,
          stage: 'error',
          errorMessage: message,
          statusMessage: '',
        }));
        return false;
      }
    },
    [brandName, brandUrl, brandNotes, promptTone, blogAngle, updateAgentState]
  );

  const handleStopAgent = useCallback((agentType: AgentKind) => {
    controllersRef.current[agentType]?.abort();
  }, []);

  const handleStopAllAgents = useCallback(() => {
    queueAbortRef.current = true;
    setIsQueueRunning(false);
    (['prompt_runner', 'site_readability', 'blog_creator'] as AgentKind[]).forEach((id) => {
      controllersRef.current[id]?.abort();
    });
  }, []);

  const handleRunAllAgents = useCallback(async () => {
    if (!brandName.trim()) {
      setBrandInputError('Please enter a brand or product name before running the agents.');
      document.getElementById('brand-name-input')?.focus();
      return;
    }

    queueAbortRef.current = false;
    setIsQueueRunning(true);

    const sequence: AgentKind[] = ['prompt_runner', 'site_readability', 'blog_creator'];
    for (let i = 0; i < sequence.length; i += 1) {
      if (queueAbortRef.current) break;
      const agent = sequence[i];
      setActiveAgent(agent);
      await runAgent(agent);
      if (i < sequence.length - 1 && !queueAbortRef.current) {
        await new Promise((resolve) => window.setTimeout(resolve, 3000));
      }
    }

    setIsQueueRunning(false);
  }, [brandName, runAgent]);

  const handleRerunRecord = useCallback(
    (run: BrandRunRecord) => {
      setBrandName(run.brandName);
      setBrandUrl(run.brandUrl ?? '');
      setBrandNotes(run.brandNotes ?? '');
      setActiveAgent(run.agentType);
      document.getElementById('agents')?.scrollIntoView({ behavior: 'smooth' });

      void runAgent(run.agentType, {
        brandName: run.brandName,
        brandUrl: run.brandUrl ?? '',
        brandNotes: run.brandNotes ?? '',
        customPrompt: run.agentType === 'prompt_runner' ? run.stage1Content : undefined,
        customTitle: run.agentType === 'prompt_runner' ? run.title : undefined,
      });
    },
    [runAgent]
  );

  const handleDeleteRun = useCallback((id: string) => {
    setRuns((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setRuns([]);
  }, []);

  const hasAnyRunning = Object.values(agentStates).some(
    (s) => s.stage === 'preparing' || s.stage === 'streaming'
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        isQueueRunning={isQueueRunning}
        hasAnyRunning={hasAnyRunning}
        onRunAll={() => void handleRunAllAgents()}
        onStopAll={handleStopAllAgents}
      />

      <main className="flex-1">
        <BrandAgentsWorkspace
          brandName={brandName}
          onChangeBrandName={(val) => {
            setBrandName(val);
            if (brandInputError && val.trim()) setBrandInputError(null);
          }}
          brandUrl={brandUrl}
          onChangeBrandUrl={setBrandUrl}
          brandNotes={brandNotes}
          onChangeBrandNotes={setBrandNotes}
          brandInputError={brandInputError}
          promptTone={promptTone}
          onChangePromptTone={setPromptTone}
          blogAngle={blogAngle}
          onChangeBlogAngle={setBlogAngle}
          activeAgent={activeAgent}
          onSelectAgent={setActiveAgent}
          agentStates={agentStates}
          isQueueRunning={isQueueRunning}
          onRunSingleAgent={(agent) => void runAgent(agent)}
          onStopAgent={handleStopAgent}
          onRunAllAgents={() => void handleRunAllAgents()}
          onStopAllAgents={handleStopAllAgents}
        />

        <AgentAnalytics
          runs={runs}
          isRunning={hasAnyRunning || isQueueRunning}
          onRunAllAgents={() => void handleRunAllAgents()}
        />

        <RunHistory
          runs={runs}
          isRunning={hasAnyRunning || isQueueRunning}
          onRerunRecord={handleRerunRecord}
          onDeleteRun={handleDeleteRun}
          onClearAll={handleClearAll}
          onRunAllAgents={() => void handleRunAllAgents()}
        />

        <WorkflowSection />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>KindPrompt · Positive Brand Prompt, Readability & Blog Agents</span>
          <span>Powered by Gemini</span>
        </div>
      </footer>
    </div>
  );
}
