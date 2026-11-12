export type ParsedEnvExampleKey = {
  key: string;
  optional: boolean;
  placeholder: string;
};

export type ParsedEnvExampleSection = {
  id: string;
  title: string;
  description: string;
  keys: ParsedEnvExampleKey[];
};

/**
 * Section title from a header comment — text before the first ":", " —", " (" or " →",
 * whichever comes first ("Dev: npm run dev … (unset …)" → "Dev").
 */
const titleFromComment = (line: string): string => {
  const text = line.replace(/^#\s*/, '').trim();
  const cuts = [text.search(/\s[—(→]/), text.indexOf(':')].filter((i) => i > 0);
  if (cuts.length > 0) {
    return text.slice(0, Math.min(...cuts)).trim();
  }
  return text;
};

const slugId = (title: string, index: number): string => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `section-${index}`;
};

const parseKeyLine = (line: string): ParsedEnvExampleKey | null => {
  const active = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (active) {
    return { key: active[1], optional: false, placeholder: active[2].trim() };
  }
  const commented = line.match(/^#\s*([A-Z][A-Z0-9_]*)=(.*)$/);
  if (commented) {
    return { key: commented[1], optional: true, placeholder: commented[2].trim() };
  }
  return null;
};

const parseBlock = (blockLines: string[], sectionIndex: number): ParsedEnvExampleSection | null => {
  const comments: string[] = [];
  const keys: ParsedEnvExampleKey[] = [];

  for (const line of blockLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed.startsWith('#')) {
      const commentedKey = parseKeyLine(trimmed);
      if (commentedKey) {
        keys.push(commentedKey);
        continue;
      }
      comments.push(trimmed);
      continue;
    }
    const parsedKey = parseKeyLine(trimmed);
    if (parsedKey) {
      keys.push(parsedKey);
    }
  }

  if (keys.length === 0 && comments.length === 0) {
    return null;
  }

  const title =
    comments.length > 0 ? titleFromComment(comments[0]) : keys.length > 0 ? 'General' : 'Section';
  // Whatever follows the title on the header line ("— browser client (…)") leads the description.
  const headerText = comments.length > 0 ? comments[0].replace(/^#\s*/, '').trim() : '';
  const headerRest = headerText
    .slice(title.length)
    .replace(/^[\s:—→-]+/, '')
    .replace(/^\((.*)\)\.?$/, '$1')
    .trim();
  const description = [
    headerRest,
    ...comments.slice(1).map((l) => l.replace(/^#\s*/, '').trim()),
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: slugId(title, sectionIndex),
    title,
    description,
    keys,
  };
};

const splitBlockIntoChunks = (blockLines: string[]): string[][] => {
  const chunks: string[][] = [];
  let current: string[] = [];
  let hasRequiredKey = false;

  for (const line of blockLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const isCommentOnly = trimmed.startsWith('#') && parseKeyLine(trimmed) === null;
    const parsedKey = parseKeyLine(trimmed);

    if (isCommentOnly && hasRequiredKey && current.length > 0) {
      chunks.push(current);
      current = [line];
      hasRequiredKey = false;
      continue;
    }

    current.push(line);
    if (parsedKey && !parsedKey.optional) {
      hasRequiredKey = true;
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks.length > 0 ? chunks : [blockLines];
};

/**
 * Parse `.env.example` into sections — blank-line-separated blocks; new `#` headers after keys split a block.
 * Blocks without keys are dropped; sections sharing an id are merged.
 */
export const parseEnvExample = (content: string): ParsedEnvExampleSection[] => {
  const blocks = content.split(/\n\s*\n/);
  const sections: ParsedEnvExampleSection[] = [];
  const seenKeys = new Set<string>();
  let sectionIndex = 0;

  for (const block of blocks) {
    const lines = block.split('\n');
    const chunks = splitBlockIntoChunks(lines);

    for (const chunk of chunks) {
      const parsed = parseBlock(chunk, sectionIndex);
      if (!parsed) {
        continue;
      }

      const dedupedKeys: ParsedEnvExampleKey[] = [];
      for (const key of parsed.keys) {
        if (seenKeys.has(key.key)) {
          continue;
        }
        seenKeys.add(key.key);
        dedupedKeys.push(key);
      }

      if (dedupedKeys.length === 0 && !parsed.description) {
        continue;
      }

      sections.push({ ...parsed, keys: dedupedKeys });
      sectionIndex += 1;
    }
  }

  if (sections.length === 0) {
    return [{ id: 'general', title: 'General', description: '', keys: [] }];
  }

  // Comment-only blocks (notes like "Dev: npm run dev picks…") have nothing to fill in — skip them.
  const withKeys = sections.filter((s) => s.keys.length > 0);
  if (withKeys.length === 0) {
    return [{ id: 'general', title: 'General', description: '', keys: [] }];
  }
  return mergeSectionsById(withKeys);
};

/**
 * Merge sections that share an id (e.g. several header-less key blocks all titled "General")
 * into one, keeping the position of the first occurrence.
 */
const mergeSectionsById = (sections: ParsedEnvExampleSection[]): ParsedEnvExampleSection[] => {
  const merged: ParsedEnvExampleSection[] = [];
  const byId = new Map<string, ParsedEnvExampleSection>();

  for (const section of sections) {
    const existing = byId.get(section.id);
    if (!existing) {
      const copy = { ...section, keys: [...section.keys] };
      byId.set(section.id, copy);
      merged.push(copy);
      continue;
    }
    existing.keys.push(...section.keys);
    if (section.description && !existing.description.includes(section.description)) {
      existing.description = [existing.description, section.description].filter(Boolean).join(' ');
    }
  }

  return merged;
};
