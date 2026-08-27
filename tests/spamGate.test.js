const assert = require('assert');
const { runSpamGate } = require('../backend/pipeline/spamGate');

console.log('==================================================');
console.log('=== Running Spam Gate Architecture Unit Tests ===');
console.log('==================================================\n');

let passed = 0;
let failed = 0;

async function runTest(testName, testFn) {
  try {
    await testFn();
    console.log(`✓ [PASSED] ${testName}`);
    passed++;
  } catch (err) {
    console.error(`✗ [FAILED] ${testName}: ${err.message}`);
    failed++;
  }
}

async function executeTestSuite() {
  // TEST 1: No image + valid description => spam = true, insert NOT CALLED
  await runTest('TEST 1: No image + valid description => isSpam = true', async () => {
    let insertCalled = false;
    const reportPayload = {
      id: 'REP-TEST-1',
      description: 'Pothole on Main Street',
      image_url: null,
      device_id: 'device-1'
    };

    const gateResult = await runSpamGate(reportPayload, { mockFrequency: 0 });
    
    if (!gateResult.isSpam) {
      insertCalled = true; // DB insert mock call
    }

    assert.strictEqual(gateResult.isSpam, true);
    assert.deepStrictEqual(gateResult.reasons, ['NO_PHOTO']);
    assert.strictEqual(insertCalled, false, 'Database INSERT must NOT be called for spam');
  });

  // TEST 2: Valid image + empty description => spam = true, insert NOT CALLED
  await runTest('TEST 2: Valid image + empty description => isSpam = true', async () => {
    let insertCalled = false;
    const reportPayload = {
      id: 'REP-TEST-2',
      description: '   ',
      image_url: 'https://example.com/pothole.jpg',
      device_id: 'device-1'
    };

    const gateResult = await runSpamGate(reportPayload, { mockFrequency: 0 });

    if (!gateResult.isSpam) {
      insertCalled = true;
    }

    assert.strictEqual(gateResult.isSpam, true);
    assert.deepStrictEqual(gateResult.reasons, ['EMPTY_DESCRIPTION']);
    assert.strictEqual(insertCalled, false, 'Database INSERT must NOT be called for spam');
  });

  // TEST 3: No image + empty description => spam = true, insert NOT CALLED
  await runTest('TEST 3: No image + empty description => isSpam = true', async () => {
    let insertCalled = false;
    const reportPayload = {
      id: 'REP-TEST-3',
      description: '',
      image_url: '',
      device_id: 'device-1'
    };

    const gateResult = await runSpamGate(reportPayload, { mockFrequency: 0 });

    if (!gateResult.isSpam) {
      insertCalled = true;
    }

    assert.strictEqual(gateResult.isSpam, true);
    assert.deepStrictEqual(gateResult.reasons, ['NO_PHOTO', 'EMPTY_DESCRIPTION']);
    assert.strictEqual(insertCalled, false, 'Database INSERT must NOT be called for spam');
  });

  // TEST 4: Valid image + valid description + normal device activity => spam = false, insert CALLED
  await runTest('TEST 4: Valid image + description + normal activity => isSpam = false', async () => {
    let insertCalled = false;
    const reportPayload = {
      id: 'REP-TEST-4',
      description: 'Water leak on sidewalk',
      image_url: 'https://example.com/water.jpg',
      device_id: 'device-normal'
    };

    const gateResult = await runSpamGate(reportPayload, { mockFrequency: 1 });

    if (!gateResult.isSpam) {
      insertCalled = true;
    }

    assert.strictEqual(gateResult.isSpam, false);
    assert.deepStrictEqual(gateResult.reasons, []);
    assert.strictEqual(insertCalled, true, 'Database INSERT MUST be called for legitimate report');
  });

  // TEST 5: Device already has 3 reports within last 10 minutes => spam = true, insert NOT CALLED
  await runTest('TEST 5: Device has >= 3 reports in 10 mins => isSpam = true', async () => {
    let insertCalled = false;
    const reportPayload = {
      id: 'REP-TEST-5',
      description: 'Overfilled garbage bin',
      image_url: 'https://example.com/garbage.jpg',
      device_id: 'device-spammer'
    };

    const gateResult = await runSpamGate(reportPayload, { mockFrequency: 3 });

    if (!gateResult.isSpam) {
      insertCalled = true;
    }

    assert.strictEqual(gateResult.isSpam, true);
    assert.deepStrictEqual(gateResult.reasons, ['TOO_MANY_REPORTS_FROM_DEVICE']);
    assert.strictEqual(insertCalled, false, 'Database INSERT must NOT be called when rate limit reached');
  });

  // TEST 6: Device has fewer than 3 reports in previous 10 minutes => spam = false, insert CALLED
  await runTest('TEST 6: Device has < 3 reports in 10 mins => isSpam = false', async () => {
    let insertCalled = false;
    const reportPayload = {
      id: 'REP-TEST-6',
      description: 'Streetlight not working',
      image_url: 'https://example.com/lamp.jpg',
      device_id: 'device-2'
    };

    const gateResult = await runSpamGate(reportPayload, { mockFrequency: 2 });

    if (!gateResult.isSpam) {
      insertCalled = true;
    }

    assert.strictEqual(gateResult.isSpam, false);
    assert.deepStrictEqual(gateResult.reasons, []);
    assert.strictEqual(insertCalled, true, 'Database INSERT MUST be called for legitimate report');
  });

  console.log(`\n==================================================`);
  console.log(`Test Execution Complete: ${passed} passed, ${failed} failed.`);
  console.log(`==================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

executeTestSuite();
