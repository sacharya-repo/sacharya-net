import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

export type StudyCard = {
  href: string;
  title: string;
  summary: string;
  tags: string[];
  index: string;
  featured: boolean;
  metrics: { value: string; label: string }[];
};

const pipeline = ['Identity', 'Route', 'Policy', 'Tool', 'Ledger'];

export default function BentoGrid({ studies }: { studies: StudyCard[] }) {
  const reduce = useReducedMotion();

  return (
    <div className="grid gap-4 lg:grid-cols-6">
      {studies.map((study, index) => (
        <motion.a
          key={study.href}
          href={study.href}
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -10% 0px' }}
          transition={{ duration: 0.6, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
          whileHover={reduce ? undefined : { y: -4 }}
          className={
            study.featured
              ? 'group relative flex min-h-[22rem] flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200 bg-white/80 p-7 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset] lg:col-span-4 lg:row-span-2 lg:min-h-[28rem] lg:p-9 dark:border-neutral-800 dark:bg-neutral-950/60 dark:shadow-none'
              : 'group relative flex min-h-[16rem] flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200 bg-white/75 p-6 lg:col-span-2 dark:border-neutral-800 dark:bg-neutral-950/50'
          }
        >
          {study.featured && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(166,132,86,0.18),transparent_68%)]"
            />
          )}
          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-[11px] tracking-[0.18em] text-neutral-500 uppercase">
                Case {study.index}
              </p>
              <ArrowUpRight
                className="size-4 text-neutral-400 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-950 dark:group-hover:text-white"
                strokeWidth={1.75}
              />
            </div>
            <h3
              className={
                study.featured
                  ? 'mt-6 max-w-xl text-2xl leading-tight font-medium tracking-[-0.03em] text-neutral-950 sm:text-3xl dark:text-white'
                  : 'mt-5 text-xl leading-snug font-medium tracking-[-0.03em] text-neutral-950 dark:text-white'
              }
            >
              {study.title}
            </h3>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {study.summary}
            </p>
            {study.featured && (
              <ol className="mt-8 flex flex-wrap items-center gap-2">
                {pipeline.map((step, stepIndex) => (
                  <li key={step} className="flex items-center gap-2">
                    <span className="rounded-full border border-neutral-200 px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] text-neutral-500 uppercase dark:border-neutral-800">
                      {step}
                    </span>
                    {stepIndex < pipeline.length - 1 && (
                      <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">
                        /
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="relative mt-8">
            <ul className="flex flex-wrap gap-2">
              {study.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-neutral-200 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-neutral-500 uppercase dark:border-neutral-800"
                >
                  {tag}
                </li>
              ))}
            </ul>
            {study.featured && (
              <dl className="mt-6 grid gap-4 border-t border-neutral-200 pt-6 sm:grid-cols-3 dark:border-neutral-800">
                {study.metrics.map((metric) => (
                  <div key={metric.label}>
                    <dt className="font-mono text-[10px] tracking-[0.16em] text-neutral-500 uppercase">
                      {metric.label}
                    </dt>
                    <dd className="mt-1 text-lg font-medium tracking-tight text-neutral-950 dark:text-white">
                      {metric.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </motion.a>
      ))}
    </div>
  );
}
