export const DEFAULT_GITHUB_ORG = 'Luckee-Core';

/**
 * Build a public GitHub repo URL from org + repo slug.
 */
export const toGithubRepoUrl = (
  githubOrg: string,
  repo: string | null | undefined,
): string | undefined => {
  if (!repo) {
    return undefined;
  }
  return `https://github.com/${githubOrg}/${repo}`;
};
