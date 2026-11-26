export const site = {
  name: 'Shantanu Acharya',
  monogram: 'SA.',
  url: 'https://sacharya.net',
  email: 'hello@sacharya.net',
  role: 'Enterprise & AI Architect',
  title: 'Shantanu Acharya — Architecting Governed AI Systems',
  description:
    'Shantanu Acharya architects governed AI systems and resilient enterprise platforms: policy-compliant agentic architectures, semantic context layers, and scalable cloud systems.',
  ogImage: '/og.png',
  headshot: '/headshot.webp',
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
    label: 'Email',
    href: 'mailto:hello@sacharya.net',
    icon: 'mail',
  },
] as const;

export const focusAreas = [
  'Governed agentic systems and runtime policy enforcement',
  'Semantic context layers, ontologies, and knowledge graphs',
  'Cloud-native modernization of enterprise platforms',
  'Regulated AI in healthcare data and interoperability',
];

export const speakingTopics = [
  'From experimental agents to production control planes',
  'Harness engineering around probabilistic models',
  'Ontology-driven impact analysis for modernization',
  'Model routing, latency, and token economics',
];

export const affiliations = [
  'IBM — Enterprise & AI Architect',
  'TOGAF 9 Certified Architect',
  'TMIET, Institution of Engineering and Technology',
  'IEEE Senior Member and ACM Senior Member',
  '2026 IBM Gold Circle Award',
];
