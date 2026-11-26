export const site = {
  name: 'Shantanu Acharya',
  monogram: 'SA.',
  url: 'https://www.sacharya.net',
  email: 'hello@sacharya.net',
  role: 'Enterprise & AI Architect',
  title: 'Shantanu Acharya — Architecting Governed AI Systems',
  description:
    'Shantanu Acharya architects governed AI systems and resilient enterprise platforms: policy-compliant agentic architectures, semantic context layers, and scalable cloud systems.',
  ogImage: '/og.png',
  headshot: '/headshot.webp',
  location: 'Glen Allen, Virginia',
} as const;

export const nav = [
  { href: '/case-studies', label: 'Architecture' },
  { href: '/writing', label: 'Writing' },
  { href: '/about', label: 'About' },
] as const;

export const socials = [
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/shantanuacharya/',
    icon: 'linkedin',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/sacharya-repo',
    icon: 'github',
  },
  {
    label: 'Medium',
    href: 'https://medium.com/@s-acharya',
    icon: 'medium',
  },
  {
    label: 'Substack',
    href: 'https://shantanua.substack.com',
    icon: 'substack',
  },
  {
    label: 'Email',
    href: 'mailto:hello@sacharya.net',
    icon: 'mail',
  },
] as const;

export const executiveBio = [
  'I am an Enterprise & AI Architect with more than twenty years in healthcare technology and large-scale transformation, working at the intersection of agentic AI, enterprise data platforms, cloud modernization, and governed automation.',
  'At IBM I translate business and technology strategy into executable architectures: multi-agent orchestration, semantic and knowledge-graph context, model routing, human-in-the-loop workflows, and AI-ready data foundations for regulated industries.',
  'My practice spans strategy through implementation. I focus on making emerging AI capabilities operational—measurable, auditable, and compatible with the microservices and data platforms enterprises already run.',
] as const;

export const honors = [
  '2026 IBM Gold Circle Award',
  'TOGAF 9 Certified Enterprise Architect',
  'Technical Member (TMIET), Institution of Engineering and Technology',
  'IEEE Senior Member',
  'ACM Senior Member',
] as const;

export const focusAreas = [
  'Governed agentic systems and runtime policy enforcement',
  'Semantic context layers, ontologies, and knowledge graphs',
  'Cloud-native modernization of enterprise platforms',
  'Regulated AI in healthcare data and interoperability',
] as const;

export const speakingTopics = [
  'From experimental agents to production control planes',
  'Persistent memory and ontology-driven agent context',
  'Harness engineering around probabilistic models',
  'Model routing, latency, and token economics',
] as const;

export const affiliations = [
  'IBM — Enterprise & AI Architect (Richmond, Virginia)',
  'Healthcare payer ecosystem: claims, clinical data, interoperability',
  'Open source & reference architectures — github.com/sacharya-repo',
] as const;