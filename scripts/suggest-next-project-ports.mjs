#!/usr/bin/env node
/**
 * Prints the next suggested API/Web port pair after the highest port in the registry.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const registryPath = path.join(__dirname, '../data/projects.registry.json');

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

let maxPort = 3009;

for (const project of registry) {
  for (const repo of project.repos ?? []) {
    if (repo.defaultApiPort != null) {
      maxPort = Math.max(maxPort, repo.defaultApiPort);
    }
    if (repo.defaultWebPortStart != null) {
      maxPort = Math.max(maxPort, repo.defaultWebPortStart);
    }
  }
}

const nextApi = maxPort + 1;
const nextWeb = maxPort + 2;

console.log(`Highest port in registry: ${maxPort}`);
console.log(`Suggested next full-stack project:`);
console.log(`  defaultApiPort: ${nextApi}`);
console.log(`  defaultWebPortStart: ${nextWeb}`);
console.log(`Express-only project: defaultApiPort: ${nextApi}`);
