const assert = require('assert');
const { detectSpam } = require('../backend/pipeline/spamDetection');

console.log('==================================================');
console.log('=== Running Spam Detection Pipeline Unit Tests ===');
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
  // CASE 1: No photo + valid description
  await runTest('CASE 1: No photo + valid description => NO_PHOTO spam', async () => {
    const report = {
      id: 'CIV-1001',
      description: 'Pothole on Main Street',
      image_url: null,
      device_id: 'device-abc'
    };
    const result = await detectSpam(report, { mockFrequency: 0 });
    
    assert.strictEqual(result.spam.isSpam, true);
    assert.deepStrictEqual(result.spam.reasons, ['NO_PHOTO']);
    assert.strictEqual(result.pipeline.continue, false);
    assert.strictEqual(result.pipeline.nextStage, null);
    assert.strictEqual(result.report.status, 'Spam');
  });

  // CASE 2: Photo + empty description
  await runTest('CASE 2: Photo + empty description => EMPTY_DESCRIPTION spam', async () => {
    const report = {
      id: 'CIV-1002',
      description: '   ',
      image_url: 'https://example.com/photo.jpg',
      device_id: 'device-abc'
    };
    const result = await detectSpam(report, { mockFrequency: 0 });

    assert.strictEqual(result.spam.isSpam, true);
    assert.deepStrictEqual(result.spam.reasons, ['EMPTY_DESCRIPTION']);
    assert.strictEqual(result.pipeline.continue, false);
    assert.strictEqual(result.pipeline.nextStage, null);
    assert.strictEqual(result.report.status, 'Spam');
  });

  // CASE 3: No photo + empty description
  await runTest('CASE 3: No photo + empty description => NO_PHOTO and EMPTY_DESCRIPTION spam', async () => {
    const report = {
      id: 'CIV-1003',
      description: '',
      image_url: '',
      device_id: 'device-abc'
    };
    const result = await detectSpam(report, { mockFrequency: 0 });

    assert.strictEqual(result.spam.isSpam, true);
    assert.deepStrictEqual(result.spam.reasons, ['NO_PHOTO', 'EMPTY_DESCRIPTION']);
    assert.strictEqual(result.pipeline.continue, false);
    assert.strictEqual(result.pipeline.nextStage, null);
    assert.strictEqual(result.report.status, 'Spam');
  });

  // CASE 4: Photo + description + normal device activity
  await runTest('CASE 4: Photo + description + normal device activity => Clean report', async () => {
    const report = {
      id: 'CIV-1004',
      description: 'Broken streetlight near apartment block',
      image_url: 'https://example.com/light.jpg',
      device_id: 'device-abc'
    };
    const result = await detectSpam(report, { mockFrequency: 2 });

    assert.strictEqual(result.spam.isSpam, false);
    assert.deepStrictEqual(result.spam.reasons, []);
    assert.strictEqual(result.pipeline.continue, true);
    assert.strictEqual(result.pipeline.nextStage, 'categorisation');
    assert.strictEqual(result.report.id, 'CIV-1004');
  });

  // CASE 5: Photo + description + > 3 reports from device in 10 mins
  await runTest('CASE 5: Photo + description + > 3 reports from device => TOO_MANY_REPORTS_FROM_DEVICE spam', async () => {
    const report = {
      id: 'CIV-1005',
      description: 'Water leak on sidewalk',
      image_url: 'https://example.com/leak.jpg',
      device_id: 'device-spammer'
    };
    const result = await detectSpam(report, { mockFrequency: 4 });

    assert.strictEqual(result.spam.isSpam, true);
    assert.deepStrictEqual(result.spam.reasons, ['TOO_MANY_REPORTS_FROM_DEVICE']);
    assert.strictEqual(result.pipeline.continue, false);
    assert.strictEqual(result.pipeline.nextStage, null);
    assert.strictEqual(result.report.status, 'Spam');
  });

  // CASE 6: Supabase device lookup fails
  await runTest('CASE 6: Supabase device lookup fails => Error result', async () => {
    const report = {
      id: 'CIV-1006',
      description: 'Pothole on 5th Avenue',
      image_url: 'https://example.com/pothole.jpg',
      device_id: 'device-xyz'
    };
    const result = await detectSpam(report, {
      mockDeviceLookupError: new Error('Column "device_id" does not exist')
    });

    assert.ok(result.error, 'Result should contain error object');
    assert.strictEqual(result.error.code, 'SUPABASE_ERROR');
    assert.strictEqual(result.pipeline.continue, false);
    assert.strictEqual(result.pipeline.nextStage, null);
  });

  // Additional Edge Case: Missing report object
  await runTest('Edge Case: Missing or null report object', async () => {
    const result = await detectSpam(null);
    assert.ok(result.error);
    assert.strictEqual(result.error.code, 'INVALID_REPORT');
    assert.strictEqual(result.pipeline.continue, false);
  });

  console.log(`\n==================================================`);
  console.log(`Test Execution Complete: ${passed} passed, ${failed} failed.`);
  console.log(`==================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

executeTestSuite();
