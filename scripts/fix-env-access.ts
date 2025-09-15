#!/usr/bin/env ts-node

/**
 * Script to fix all process.env access issues for TypeScript strict mode
 * Replaces process.env.VARIABLE with process.env['VARIABLE']
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

async function fixEnvAccess() {
  console.log('🔧 Fixing process.env access patterns...\n');

  // Find all TypeScript files
  const files = await glob('**/*.ts', {
    ignore: ['node_modules/**', 'dist/**', 'scripts/fix-env-access.ts'],
  });

  let totalFixed = 0;

  for (const file of files) {
    const filePath = path.resolve(file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Pattern to match process.env.VARIABLE (but not process.env['VARIABLE'])
    const envPattern = /process\.env\.([A-Z_][A-Z0-9_]*)/g;

    let matches = 0;
    content = content.replace(envPattern, (_match, varName) => {
      matches++;
      return `process.env['${varName}']`;
    });

    if (matches > 0) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Fixed ${matches} occurrences in ${file}`);
      totalFixed += matches;
    }
  }

  console.log(`\n✨ Fixed ${totalFixed} process.env access issues in ${files.length} files`);
}

// Run the script
fixEnvAccess().catch(console.error);