/**
 * AutoFlow — Google Multi-Service Test & Verification
 * Tests Drive, Docs, Gmail, and Sheets service schemas and methods
 */

import { GoogleDriveService } from '../src/core/google/services/googleDriveService.ts';
import { GoogleDocsService } from '../src/core/google/services/googleDocsService.ts';
import { GoogleGmailService } from '../src/core/google/services/googleGmailService.ts';
import { GoogleAuthService } from '../src/core/google/services/googleAuthService.ts';

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('\n── Google Services Integration Tests ──');

// 1. GoogleAuthService
assert('GoogleAuthService has loginWithGoogle', typeof GoogleAuthService.loginWithGoogle === 'function');
assert('GoogleAuthService has getAccessToken', typeof GoogleAuthService.getAccessToken === 'function');
assert('GoogleAuthService has getUserEmail', typeof GoogleAuthService.getUserEmail === 'function');

// 2. GoogleDriveService
assert('GoogleDriveService has listFiles', typeof GoogleDriveService.listFiles === 'function');
assert('GoogleDriveService has searchSheets', typeof GoogleDriveService.searchSheets === 'function');
assert('GoogleDriveService has searchDocs', typeof GoogleDriveService.searchDocs === 'function');

// 3. GoogleDocsService
assert('GoogleDocsService has fetchDocument', typeof GoogleDocsService.fetchDocument === 'function');

// 4. GoogleGmailService
assert('GoogleGmailService has listRecentEmails', typeof GoogleGmailService.listRecentEmails === 'function');
assert('GoogleGmailService has fetchEmail', typeof GoogleGmailService.fetchEmail === 'function');

console.log(`\nGoogle Services Test Summary: ${passed} passed, ${failed} failed.\n`);
process.exit(failed > 0 ? 1 : 0);
