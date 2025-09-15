#!/usr/bin/env ts-node

/**
 * Script to fix remaining index signature access issues
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

async function fixIndexSignatures() {
  console.log('🔧 Fixing remaining index signature access issues...\n');

  // Find all TypeScript files
  const files = await glob('**/*.ts', {
    ignore: ['node_modules/**', 'dist/**', 'scripts/fix-*.ts'],
  });

  let totalFixed = 0;

  for (const file of files) {
    const filePath = path.resolve(file);
    let content = fs.readFileSync(filePath, 'utf-8');
    let fixes = 0;

    // Fix this.property patterns in step definitions
    const patterns = [
      // Fix this.userType, this.tenantId, etc.
      { pattern: /this\.(userType|tenantId|clientId|userEmail|testClientId|createdClientId|testGroupId|clientFormData|currentTenant|currentUser)\b/g, replacement: "this['$1']" },

      // Fix this.step() calls
      { pattern: /this\.step\(/g, replacement: "this['step'](" },

      // Fix headers.Property access
      { pattern: /headers\.(Authorization|X-[A-Za-z-]+)/g, replacement: "headers['$1']" },

      // Fix process.env.VARIABLE (if any remaining)
      { pattern: /process\.env\.([A-Z_][A-Z0-9_]*)/g, replacement: "process.env['$1']" },
    ];

    for (const { pattern, replacement } of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        fixes += matches.length;
      }
    }

    if (fixes > 0) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Fixed ${fixes} index signature issues in ${file}`);
      totalFixed += fixes;
    }
  }

  console.log(`\n✨ Fixed ${totalFixed} index signature issues`);
}

// Run the script
fixIndexSignatures().catch(console.error);