import { SpotlightSurface } from './SpotlightSurface';

export function WorkflowSection() {
  const pillars = [
    {
      index: '01',
      title: 'Run positive brand prompts on the LLM',
      description:
        'Agent 01 crafts constructive, brand-specific prompts around value, customer impact, and innovation, then dispatches them directly to Gemini and streams the response.',
      indexColor: 'text-teal-400',
      glow: 'rgba(20, 184, 166, 0.16)',
    },
    {
      index: '02',
      title: 'Update the brand site for readability',
      description:
        'Agent 02 inspects your brand URL or submitted site copy, pinpoints clarity gaps, and writes scannable headlines, benefit bullets, and LLM-friendly FAQ summaries.',
      indexColor: 'text-sky-400',
      glow: 'rgba(56, 189, 248, 0.16)',
    },
    {
      index: '03',
      title: 'Create positive brand blog articles',
      description:
        'Agent 03 plans an editorial thesis and drafts a complete, ready-to-publish positive blog post highlighting how your brand or product helps real customers.',
      indexColor: 'text-amber-400',
      glow: 'rgba(251, 146, 60, 0.16)',
    },
  ];

  return (
    <section id="workflow" className="border-t border-slate-800 bg-slate-900 text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-medium tracking-wide text-teal-300">
            Three-pillar brand strategy
          </p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            Three ways the platform strengthens your brand
          </h2>
          <p className="text-sm leading-relaxed tracking-wide text-slate-300">
            Each agent operates on your target brand name, optional website URL, and positioning context.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {pillars.map((pillar) => (
            <SpotlightSurface
              key={pillar.index}
              glowColor={pillar.glow}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 transition-colors hover:border-slate-700"
            >
              <div className="space-y-2.5">
                <p className={`font-mono text-xs font-semibold ${pillar.indexColor} tabular-nums`}>
                  {pillar.index}
                </p>
                <h3 className="font-display text-base font-semibold tracking-wide text-white">
                  {pillar.title}
                </h3>
                <p className="text-sm leading-relaxed tracking-wide text-slate-300">
                  {pillar.description}
                </p>
              </div>
            </SpotlightSurface>
          ))}
        </div>
      </div>
    </section>
  );
}
