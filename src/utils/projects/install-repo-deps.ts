import { detectApiRuntime } from './detect-api-runtime';
import { installPythonRepo, type InstallPythonRepoResult } from './install-python-repo';
import { npmInstallRepo, type NpmInstallRepoResult } from './npm-install-repo';

export type InstallRepoDepsResult = NpmInstallRepoResult | InstallPythonRepoResult;

/**
 * Install API or web dependencies using the runtime detected in the repo directory.
 */
export const installRepoDeps = async (
  dir: string,
  nvmSh: string,
  onOutput?: (line: string) => void,
): Promise<InstallRepoDepsResult> => {
  if (detectApiRuntime(dir) === 'python') {
    return installPythonRepo(dir, nvmSh, onOutput);
  }

  return npmInstallRepo(dir, nvmSh, onOutput);
};
