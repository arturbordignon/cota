import slugifyLib from 'slugify';
import { customAlphabet } from 'nanoid';

type SlugifyOptions = {
  replacement?: string;
  remove?: RegExp;
  lower?: boolean;
  strict?: boolean;
  trim?: boolean;
  locale?: string;
};

const slugify = slugifyLib as unknown as (str: string, options?: SlugifyOptions) => string;

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

export function toAccountSlug(name: string) {
  return slugify(name, {
    lower: true,
    strict: true,
    trim: true
  });
}

export function toProposalSlug(title: string) {
  const base = slugify(title, { lower: true, strict: true, trim: true }) || 'proposal';
  return `${base}-${nanoid()}`;
}
