import agentPositivePromptImg from '../assets/images/agent_positive_prompt_1794743713832.jpg';
import agentSiteReadabilityImg from '../assets/images/agent_site_readability_1794743713128.jpg';
import agentPositiveBlogImg from '../assets/images/agent_positive_blog_1794743715083.jpg';

export type AgentKind = 'prompt_runner' | 'site_readability' | 'blog_creator';

export type PromptTone =
  | 'Value & Trust'
  | 'Customer Impact'
  | 'Product Innovation'
  | 'Sustainability & Ethics'
  | 'Helpful Recommendations';

export type BlogAngle =
  | 'Customer Story'
  | 'Product Deep-Dive'
  | 'Mission & Values'
  | 'Practical How-To';

export type AgentStage =
  | 'idle'
  | 'preparing'
  | 'streaming'
  | 'complete'
  | 'error';

export interface AgentStage1Payload {
  label: string;
  title: string;
  content: string;
  subtitle: string;
  preparedMs: number;
}

export interface AgentExecutionState {
  stage: AgentStage;
  statusMessage: string;
  stage1: AgentStage1Payload | null;
  output: string;
  errorMessage: string | null;
  elapsedMs: number | null;
}

export interface BrandRunRecord {
  id: string;
  agentType: AgentKind;
  brandName: string;
  brandUrl?: string;
  brandNotes?: string;
  optionLabel: string;
  title: string;
  stage1Content: string;
  output: string;
  totalMs: number;
  createdAt: string;
}

export const AGENT_DEFINITIONS: {
  id: AgentKind;
  index: string;
  name: string;
  shortName: string;
  actionLabel: string;
  description: string;
  stage1Label: string;
  stage2Label: string;
  imageSrc: string;
  imageAlt: string;
  accentHex: string;
  glowRgba: string;
}[] = [
  {
    id: 'prompt_runner',
    index: '01',
    name: 'Positive Prompt Agent',
    shortName: 'Positive Prompt',
    actionLabel: 'Run Prompt Agent',
    description:
      'Crafts and sends an uplifting, constructive prompt about the brand or product to the LLM.',
    stage1Label: 'Stage 1 · Prompt sent to LLM',
    stage2Label: 'Stage 2 · LLM response',
    imageSrc: agentPositivePromptImg,
    imageAlt: 'Sunlit emerald teal glass panels casting luminous geometric light beams',
    accentHex: '#0d9488',
    glowRgba: 'rgba(13, 148, 136, 0.16)',
  },
  {
    id: 'site_readability',
    index: '02',
    name: 'Site Readability Agent',
    shortName: 'Site Readability',
    actionLabel: 'Optimize Site Copy',
    description:
      'Audits the brand site or copy and produces clear, scannable rewrites for humans and LLMs.',
    stage1Label: 'Stage 1 · Site scope & focus',
    stage2Label: 'Stage 2 · Readability updates',
    imageSrc: agentSiteReadabilityImg,
    imageAlt: 'Precision optical glass lenses refracting crisp cobalt blue grid light',
    accentHex: '#2563eb',
    glowRgba: 'rgba(37, 99, 235, 0.15)',
  },
  {
    id: 'blog_creator',
    index: '03',
    name: 'Positive Blog Agent',
    shortName: 'Positive Blog',
    actionLabel: 'Create Positive Blog',
    description:
      'Writes an authentic, positive long-form blog article spotlighting the brand or product.',
    stage1Label: 'Stage 1 · Article brief',
    stage2Label: 'Stage 2 · Generated blog article',
    imageSrc: agentPositiveBlogImg,
    imageAlt: 'Sunlit open linen hardcover journal with brass pen and warm amber glass',
    accentHex: '#ea580c',
    glowRgba: 'rgba(234, 88, 12, 0.15)',
  },
];

export const PROMPT_TONES: PromptTone[] = [
  'Value & Trust',
  'Customer Impact',
  'Product Innovation',
  'Sustainability & Ethics',
  'Helpful Recommendations',
];

export const BLOG_ANGLES: BlogAngle[] = [
  'Customer Story',
  'Product Deep-Dive',
  'Mission & Values',
  'Practical How-To',
];

export const BRAND_EXAMPLES: {
  brandName: string;
  brandUrl: string;
  brandNotes: string;
}[] = [
  {
    brandName: 'Patagonia',
    brandUrl: 'https://www.patagonia.com',
    brandNotes: 'Outdoor technical apparel built for durability and environmental stewardship.',
  },
  {
    brandName: 'Notion',
    brandUrl: 'https://www.notion.so',
    brandNotes: 'Connected workspace for notes, docs, wikis, and team project planning.',
  },
  {
    brandName: 'Oura Ring',
    brandUrl: 'https://ouraring.com',
    brandNotes: 'Smart ring wearable focused on sleep quality, recovery, and daily readiness.',
  },
];

export function createInitialExecutionState(): AgentExecutionState {
  return {
    stage: 'idle',
    statusMessage: '',
    stage1: null,
    output: '',
    errorMessage: null,
    elapsedMs: null,
  };
}
