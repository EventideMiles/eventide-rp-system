#!/usr/bin/env node
/**
 * @fileoverview Version bump script for Eventide RP System
 * 
 * Updates version in both package.json and system.json simultaneously.
 * This ensures version synchronization between npm package and Foundry VTT module.
 * 
 * Usage: node scripts/bump-version.js <version>
 * Example: node scripts/bump-version.js 13.23.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const version = process.argv[2];

if (!version) {
  console.error('Usage: node scripts/bump-version.js <version>');
  console.error('Example: node scripts/bump-version.js 13.23.0');
  process.exit(1);
}

// Validate version format (semver-like)
const versionRegex = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
if (!versionRegex.test(version)) {
  console.error(`Invalid version format: ${version}`);
  console.error('Version must be in format: X.Y.Z or X.Y.Z-suffix');
  process.exit(1);
}

/**
 * Update version in a JSON file
 * @param {string} filePath - Path to the JSON file
 * @param {string} version - New version string
 * @returns {string} Previous version
 */
function updateVersion(filePath, version) {
  const fullPath = path.resolve(rootDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const data = JSON.parse(content);
  const previousVersion = data.version;
  
  data.version = version;
  
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n');
  
  return previousVersion;
}

// Update both files
console.log(`Bumping version to ${version}...`);

const packagePrevious = updateVersion('package.json', version);
console.log(`  package.json: ${packagePrevious} → ${version}`);

const systemPrevious = updateVersion('system.json', version);
console.log(`  system.json: ${systemPrevious} → ${version}`);

console.log('\nVersion bump complete!');
console.log('\nNext steps:');
console.log('  1. Review the changes: git diff');
console.log('  2. Commit: git commit -am "chore: bump version to ' + version + '"');
console.log('  3. Create release branch: git checkout -b release/' + version);
console.log('  4. Push and open PR to main');