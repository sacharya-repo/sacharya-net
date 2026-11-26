import type { CollectionEntry } from 'astro:content';

export type WritingEntry = CollectionEntry<'writing'>;
export type WritingData = WritingEntry['data'];

export function writingPubDate(data: WritingData): Date {
  const value = data.pubDate ?? data.date;
  if (!value) {
    throw new Error('Writing entry is missing pubDate or date.');
  }
  return value;
}

export function writingDescription(data: WritingData): string {
  const value = data.description ?? data.summary;
  if (!value) {
    throw new Error('Writing entry is missing description or summary.');
  }
  return value;
}

export function writingReadingTime(data: WritingData): string {
  const value = data.readingTime ?? data.readTime;
  if (!value) {
    throw new Error('Writing entry is missing readingTime or readTime.');
  }
  return value;
}

export function writingSourceUrl(data: WritingData): string | undefined {
  return data.sourceUrl ?? data.externalUrl;
}