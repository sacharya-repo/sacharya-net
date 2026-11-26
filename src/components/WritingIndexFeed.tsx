import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  WRITING_TOPIC_FILTERS,
  type WritingTopicFilterId,
  type WritingTopicSlug,
} from '../lib/writing-topics';

export type WritingListItem = {
  slug: string;
  title: string;
  description: string;
  dateLabel: string;
  dateTime: string;
  readingTime: string;
  topicId: WritingTopicSlug;
};

const pillBase =
  'inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white';

function pillClass(active: boolean) {
  return active
    ? `${pillBase} border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950`
    : `${pillBase} border-neutral-200 bg-white/60 text-neutral-700 hover:border-neutral-400 hover:text-neutral-950 dark:border-neutral-800 dark:bg-white/5 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-white`;
}

export default function WritingIndexFeed({
  posts,
  heading,
  lede,
}: {
  posts: WritingListItem[];
  heading: string;
  lede: string;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<WritingTopicFilterId>('all');

  const filtered = useMemo(
    () => (active === 'all' ? posts : posts.filter((post) => post.topicId === active)),
    [active, posts],
  );

  return (
    <section className="border-t border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-28">
        <div className="mb-10 flex flex-col gap-4 md:mb-14">
          <div>
            <h2 className="max-w-xl text-3xl font-medium tracking-[-0.035em] text-neutral-950 sm:text-4xl dark:text-white">
              {heading}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{lede}</p>
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter essays by topic"
          >
            {WRITING_TOPIC_FILTERS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                aria-pressed={active === topic.id}
                onClick={() => setActive(topic.id)}
                className={pillClass(active === topic.id)}
              >
                {topic.label}
              </button>
            ))}
          </div>
          <p className="font-mono text-[10px] tracking-[0.14em] text-neutral-500 uppercase" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'essay' : 'essays'}
          </p>
        </div>

        <ol className="border-t border-neutral-200 dark:border-neutral-800">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((post, index) => (
              <motion.li
                key={post.slug}
                layout
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{
                  duration: reduce ? 0.15 : 0.28,
                  delay: reduce ? 0 : index * 0.035,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <a
                  href={`/writing/${post.slug}`}
                  className="group grid gap-3 border-b border-neutral-200 py-6 md:grid-cols-[8.5rem_1fr_auto] md:items-baseline md:gap-8 dark:border-neutral-800"
                >
                  <time
                    dateTime={post.dateTime}
                    className="font-mono text-[11px] tracking-[0.12em] text-neutral-500 uppercase"
                  >
                    {post.dateLabel}
                  </time>
                  <span>
                    <span className="block text-lg font-medium tracking-[-0.02em] text-neutral-950 group-hover:underline group-hover:decoration-neutral-300 group-hover:underline-offset-4 dark:text-white dark:group-hover:decoration-neutral-700">
                      {post.title}
                    </span>
                    <span className="mt-2 block max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                      {post.description}
                    </span>
                  </span>
                  <span className="font-mono text-[11px] tracking-[0.12em] text-neutral-500 uppercase">
                    {post.readingTime}
                  </span>
                </a>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </div>
    </section>
  );
}