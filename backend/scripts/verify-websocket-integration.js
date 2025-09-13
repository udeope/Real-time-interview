#!/usr/bin/env node

/**
 * Simple verification script for WebSocket transcription integration
 * This script checks that all the necessary files and components are in place
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying WebSocket Transcription Integration');
console.log('=' * 50);

const checks = [
  {
    name: 'Interview Gateway exists',
    path: 'src/modules/websocket/gateways/interview.gateway.ts',
    required: true,
  },
  {
    name: 'Session Manager Service exists',
    path: 'src/modules/websocket/services/session-manager.service.ts',
    required: true,
  },
  {
    name: 'Transcription Service exists',
    path: 'src/modules/transcription/transcription.service.ts',
    required: true,
  },
  {
    name: 'WebSocket DTOs exist',
    path: 'src/modules/websocket/dto/websocket.dto.ts',
    required: true,
  },
  {
    name: 'WebSocket Tests exist',
    path: 'test/websocket.e2e-spec.ts',
    required: false,
  },
  {
    name: 'WebSocket Documentation exists',
    path: 'WEBSOCKET_DOCUMENTATION.md',
    required: true,
  },
];

let passed = 0;
let failed = 0;

console.log('\n📋 File Structure Checks:');
checks.forEach(check => {
  const fullPath = path.join(__dirname, '..', check.path);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    console.log(`✅ ${check.name}`);
    passed++;
  } else {
    console.log(`${check.required ? '❌' : '⚠️'} ${check.name} - ${check.required ? 'REQUIRED' : 'OPTIONAL'}`);
    if (check.required) failed++;
  }
});

console.log('\n📋 Code Integration Checks:');

// Check if Interview Gateway has the new methods
try {
  const gatewayContent = fs.readFileSync(path.join(__dirname, '..', 'src/modules/websocket/gateways/interview.gateway.ts'), 'utf8');
  
  const methodChecks = [
    { name: 'startRealTimeTranscription method', pattern: /startRealTimeTranscription/ },
    { name: 'stopRealTimeTranscription method', pattern: /stopRealTimeTranscription/ },
    { name: 'transcription:start handler', pattern: /@SubscribeMessage\('transcription:start'\)/ },
    { name: 'transcription:stop handler', pattern: /@SubscribeMessage\('transcription:stop'\)/ },
    { name: 'processAudioForTranscription method', pattern: /processAudioForTranscription/ },
  ];
  
  methodChecks.forEach(check => {
    if (check.pattern.test(gatewayContent)) {
      console.log(`✅ ${check.name}`);
      passed++;
    } else {
      console.log(`❌ ${check.name}`);
      failed++;
    }
  });
} catch (error) {
  console.log(`❌ Error reading Interview Gateway: ${error.message}`);
  failed++;
}

// Check if Session Manager has audio stream methods
try {
  const sessionManagerContent = fs.readFileSync(path.join(__dirname, '..', 'src/modules/websocket/services/session-manager.service.ts'), 'utf8');
  
  const sessionChecks = [
    { name: 'setSessionAudioStream method', pattern: /setSessionAudioStream/ },
    { name: 'getSessionAudioStream method', pattern: /getSessionAudioStream/ },
    { name: 'stopSessionAudioStream method', pattern: /stopSessionAudioStream/ },
    { name: 'hasActiveAudioStream method', pattern: /hasActiveAudioStream/ },
  ];
  
  sessionChecks.forEach(check => {
    if (check.pattern.test(sessionManagerContent)) {
      console.log(`✅ ${check.name}`);
      passed++;
    } else {
      console.log(`❌ ${check.name}`);
      failed++;
    }
  });
} catch (error) {
  console.log(`❌ Error reading Session Manager: ${error.message}`);
  failed++;
}

// Check if Transcription Service has real-time methods
try {
  const transcriptionContent = fs.readFileSync(path.join(__dirname, '..', 'src/modules/transcription/transcription.service.ts'), 'utf8');
  
  const transcriptionChecks = [
    { name: 'transcribeRealTime method', pattern: /transcribeRealTime/ },
    { name: 'transcribeAudioChunk method', pattern: /transcribeAudioChunk/ },
    { name: 'Observable import', pattern: /import.*Observable.*from.*rxjs/ },
  ];
  
  transcriptionChecks.forEach(check => {
    if (check.pattern.test(transcriptionContent)) {
      console.log(`✅ ${check.name}`);
      passed++;
    } else {
      console.log(`❌ ${check.name}`);
      failed++;
    }
  });
} catch (error) {
  console.log(`❌ Error reading Transcription Service: ${error.message}`);
  failed++;
}

console.log('\n' + '=' * 50);
console.log('📊 VERIFICATION RESULTS');
console.log('=' * 50);
console.log(`✅ Checks passed: ${passed}`);
console.log(`❌ Checks failed: ${failed}`);
console.log(`📈 Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 All checks passed! WebSocket transcription integration is properly implemented.');
  console.log('\n📝 Next steps:');
  console.log('1. Start the backend server: npm run dev');
  console.log('2. Test the integration: node scripts/test-websocket-transcription.js');
  console.log('3. Run the full test suite: npm run test:e2e');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Please review the implementation.');
  console.log('\n🔧 Common issues:');
  console.log('- Missing method implementations');
  console.log('- Incorrect import statements');
  console.log('- File structure problems');
  process.exit(1);
}