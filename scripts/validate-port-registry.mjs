#!/usr/bin/env node
/**
 * Validates projects.registry.json port assignments.
 * Fails on duplicate ports or hub reserved range (3000-3001).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const registryPath = path.join(__dirname, '../data/projects.registry.json');

const HUB_WEB_PORT = 3000;
const HUB_API_PORT = 3001;
const PROJECT_PORT_MIN = 3010;

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const apiPorts = new Map();
const webPorts = new Map();
const errors = [];
const warnings = [];

for (const project of registry) {
  for (const repo of project.repos ?? []) {
    if (repo.defaultApiPort != null) {
      const port = repo.defaultApiPort;
      if (port === HUB_WEB_PORT || port === HUB_API_PORT) {
        errors.push(`${project.id}: API port ${port} conflicts with hub reserved ports`);
      }
      if (port < PROJECT_PORT_MIN) {
        warnings.push(`${project.id}: API port ${port} is below recommended minimum ${PROJECT_PORT_MIN}`);
      }
      const existing = apiPorts.get(port);
      if (existing) {
        errors.push(`Duplicate API port ${port}: ${existing} and ${project.id}`);
      } else {
        apiPorts.set(port, project.id);
      }
    }
    if (repo.defaultWebPortStart != null) {
      const port = repo.defaultWebPortStart;
      if (port === HUB_WEB_PORT || port === HUB_API_PORT) {
        errors.push(`${project.id}: Web port ${port} conflicts with hub reserved ports`);
      }
      if (port < PROJECT_PORT_MIN) {
        warnings.push(`${project.id}: Web port ${port} is below recommended minimum ${PROJECT_PORT_MIN}`);
      }
      const existing = webPorts.get(port);
      if (existing) {
        errors.push(`Duplicate web port ${port}: ${existing} and ${project.id}`);
      } else {
        webPorts.set(port, project.id);
      }
    }
  }
}

for (const warning of warnings) {
  console.warn(`⚠️  ${warning}`);
}

if (errors.length > 0) {
  console.error('❌ Port registry validation failed:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log(`✅ Port registry valid (${registry.length} projects, ${apiPorts.size} API ports, ${webPorts.size} web ports)`);
