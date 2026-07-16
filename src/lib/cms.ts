import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';

export const reader = createReader(process.cwd(), keystaticConfig);

export async function getSettings() {
  const settings = await reader.singletons.settings.read();
  if (!settings) throw new Error('Missing CMS content: src/content/settings.json');
  return settings;
}

export async function getHomepage() {
  const homepage = await reader.singletons.homepage.read();
  if (!homepage) throw new Error('Missing CMS content: src/content/homepage.json');
  return homepage;
}

export async function getGallery() {
  const entries = await reader.collections.gallery.all();
  return entries
    .map((e) => ({ slug: e.slug, ...e.entry }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function getStayOptions() {
  const entries = await reader.collections.stayOptions.all();
  return entries
    .map((e) => ({ slug: e.slug, ...e.entry }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
