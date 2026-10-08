import fs from 'fs';
import path from 'path';

export type ApiRuntime = 'node' | 'python';

/**
 * Detect whether an API repo is Node or Python from files in the directory.
 * Python when a Python manifest exists and package.json does not.
 */
export const detectApiRuntime = (dir?: string): ApiRuntime => {
  if (!dir || !fs.existsSync(dir)) {
    return 'node';
  }

  const hasPackageJson = fs.existsSync(path.join(dir, 'package.json'));
  const hasPythonManifest =
    fs.existsSync(path.join(dir, 'pyproject.toml')) ||
    fs.existsSync(path.join(dir, 'requirements.txt'));

  if (hasPythonManifest && !hasPackageJson) {
    return 'python';
  }

  return 'node';
};

/**
 * True when the API repo has runtime dependencies installed.
 * Node looks for node_modules. Python looks for .venv.
 */
export const apiDepsInstalled = (dir?: string): boolean => {
  if (!dir) {
    return false;
  }

  if (detectApiRuntime(dir) === 'python') {
    return fs.existsSync(path.join(dir, '.venv'));
  }

  return fs.existsSync(path.join(dir, 'node_modules'));
};
