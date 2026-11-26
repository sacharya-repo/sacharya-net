export const WRITING_TOPIC_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'governance-harness', label: 'Governance & Harness' },
  { id: 'context-ontologies', label: 'Context & Ontologies' },
  { id: 'healthcare-ai', label: 'Healthcare AI' },
  { id: 'model-routing', label: 'Model Routing' },
] as const;

export type WritingTopicFilterId = (typeof WRITING_TOPIC_FILTERS)[number]['id'];
export type WritingTopicSlug = Exclude<WritingTopicFilterId, 'all'>;

const topicByEssaySlug: Record<string, WritingTopicSlug> = {
  'harness-engineering-for-production-agents': 'governance-harness',
  'beyond-vector-rag-semantic-context-layers': 'context-ontologies',
  'pragmatic-ontologies-pole-o-enterprise': 'context-ontologies',
  'from-persistent-memory-to-predictive-context': 'healthcare-ai',
  'building-enterprise-agentic-ai-persistent-memory-model-routing': 'model-routing',
};

export function writingTopicForSlug(slug: string): WritingTopicSlug {
  return topicByEssaySlug[slug] ?? 'context-ontologies';
}