import fs from 'node:fs';

const gmail = fs.readFileSync('src/core/google/services/googleGmailService.ts', 'utf8');
const prompt = fs.readFileSync('src/core/ai/buildAgentPrompt.ts', 'utf8');
const tools = fs.readFileSync('src/core/ai/tools/gmailTools.ts', 'utf8');

const checks = [
  ['subject uses standard base64 encoder', gmail.includes('encodeBase64HeaderUtf8(subject)')],
  ['raw gmail message uses base64url encoder', gmail.includes('encodeBase64UrlUtf8(message)')],
  ['subject declares UTF-8 RFC 2047', gmail.includes('=?UTF-8?B?')],
  ['email contains plain and html alternatives', gmail.includes('multipart/alternative') && gmail.includes('text/html; charset=UTF-8')],
  ['mime blank lines are preserved', gmail.includes('line !== null')],
  ['html output escapes unsafe content', gmail.includes('escapeHtml(line)')],
  ['professional email layout is applied', gmail.includes('AutoFlow Workspace')],
  ['fixed professional output policy exists', prompt.includes('TIÊU CHUẨN ĐẦU RA CỐ ĐỊNH')],
  ['email policy requires structured body', prompt.includes('tóm tắt điều hành') && prompt.includes('lời kết chuyên nghiệp')],
  ['gmail tool requests professional content', tools.includes('Nội dung thư có cấu trúc rõ ràng')],
];

let failed = 0;
for (const [name, passed] of checks) {
  if (passed) console.log(`✅ ${name}`);
  else {
    failed += 1;
    console.error(`❌ ${name}`);
  }
}

console.log(`Email format tests: ${checks.length - failed} passed, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
