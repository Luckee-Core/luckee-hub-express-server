/**
 * Hand-written project overview — `data/project-overviews/<projectId>.json`.
 * Inline `code` in strings is wrapped in backticks; `**bold**` marks UI labels.
 */
export type ProjectOverview = {
  projectId: string;
  updatedAt: string;
  tagline: string;
  summary: string[];
  audience: string[];
  notFor: string[];
  capabilities: { title: string; detail: string }[];
  components: {
    repoName: string;
    name: string;
    stack: string;
    runsOn: string;
    owns: string;
    doesNotOwn: string;
    inHub: boolean;
    /** HTTP endpoints this part serves; method `PAGE` marks a web route. Empty = none yet. */
    api?: { method: string; path: string; purpose: string }[];
  }[];
  dataFlow: string[];
  trust: { title: string; detail: string }[];
  commonTasks: { title: string; when: string; steps: string[] }[];
  troubleshooting: { symptom: string; fix: string }[];
  glossary: { term: string; definition: string }[];
  hubNotes: string[];
  links: { label: string; path: string }[];
};
