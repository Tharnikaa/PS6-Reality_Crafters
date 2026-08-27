const assert = require('assert');
const { runMultiLayerSpamCheck } = require('../backend/pipeline/spamGate');
const { computeImageHash, calculateHammingDistance } = require('../services/imageHashService');
const { generateImageEmbedding, calculateCosineSimilarity } = require('../services/imageEmbeddingService');

console.log('===========================================================');
console.log('=== Running Multi-Layer Visual + Behavioural Spam Tests ===');
console.log('===========================================================\n');

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
  // TEST 1: Same device submits 3 reports -> All 3 accepted
  await runTest('TEST 1: Same device submits 3 reports within 10 minutes => All 3 accepted', async () => {
    const report1 = { id: 'R1', device_id: 'dev-user-1', description: 'Pothole A', lat: 13.08, lng: 80.27 };
    const report2 = { id: 'R2', device_id: 'dev-user-1', description: 'Pothole B', lat: 13.08, lng: 80.27 };
    const report3 = { id: 'R3', device_id: 'dev-user-1', description: 'Pothole C', lat: 13.08, lng: 80.27 };

    const res1 = await runMultiLayerSpamCheck(report1, 'img-a', { mockFrequency: 0 });
    const res2 = await runMultiLayerSpamCheck(report2, 'img-b', { mockFrequency: 1 });
    const res3 = await runMultiLayerSpamCheck(report3, 'img-c', { mockFrequency: 2 });

    assert.strictEqual(res1.isSpam, false, '1st report must be accepted');
    assert.strictEqual(res2.isSpam, false, '2nd report must be accepted');
    assert.strictEqual(res3.isSpam, false, '3rd report must be accepted');
  });

  // TEST 2: Same device submits 4th report within 10 minutes => 4th rejected
  await runTest('TEST 2: Same device submits 4th report within 10 minutes => 4th rejected', async () => {
    const report4 = { id: 'R4', device_id: 'dev-user-1', description: 'Pothole D', lat: 13.08, lng: 80.27 };
    const res4 = await runMultiLayerSpamCheck(report4, 'img-d', { mockFrequency: 3 });

    assert.strictEqual(res4.isSpam, true, '4th report must be rejected as spam');
    assert.ok(res4.reasons.includes('TOO_MANY_REPORTS_FROM_DEVICE'), 'Reason must be TOO_MANY_REPORTS_FROM_DEVICE');
  });

  // TEST 3: Same exact image uploaded twice => Second submission detected as near duplicate
  await runTest('TEST 3: Same exact image uploaded twice => Near duplicate detected via pHash', async () => {
    const sampleImage = 'image-buffer-data-content-12345';
    const hash = computeImageHash(sampleImage);

    const existingReports = [{
      id: 'REP-EXISTING-1',
      category: 'Pothole & Surface Damage',
      lat: 13.0827,
      lng: 80.2707,
      timestamp: new Date().toISOString(),
      image_phash: hash
    }];

    const newReport = {
      id: 'REP-NEW-IMAGE',
      category: 'Pothole & Surface Damage',
      lat: 13.0827,
      lng: 80.2707,
      device_id: 'dev-user-new'
    };

    const res = await runMultiLayerSpamCheck(newReport, sampleImage, { candidateReports: existingReports, mockFrequency: 0 });

    assert.strictEqual(res.isSpam, true, 'Exact image duplicate must be rejected');
    assert.ok(res.reasons.includes('NEAR_DUPLICATE_IMAGE'), 'Reason must be NEAR_DUPLICATE_IMAGE');
  });

  // TEST 4: Same image compressed/resized => pHash detects near duplicate
  await runTest('TEST 4: Same image compressed/resized => pHash detects near duplicate', async () => {
    const hash1 = '1111000011110000111100001111000011110000111100001111000011110000';
    const hash2 = '1111000011110000111100001111000011110000111100001111000011110001'; // 1 bit diff

    const dist = calculateHammingDistance(hash1, hash2);
    assert.ok(dist <= 5, 'Hamming distance must be within threshold');

    const existingReports = [{
      id: 'REP-PREV-RESIZED',
      category: 'Garbage Overflow',
      lat: 13.0418,
      lng: 80.2341,
      timestamp: new Date().toISOString(),
      image_phash: hash1
    }];

    const newReport = {
      id: 'REP-RESIZED',
      category: 'Garbage Overflow',
      lat: 13.0418,
      lng: 80.2341,
      device_id: 'dev-unique-2'
    };

    const res = await runMultiLayerSpamCheck(newReport, 'resized-image-content', {
      candidateReports: existingReports,
      mockHash: hash2,
      mockFrequency: 0
    });

    assert.strictEqual(res.isSpam, true, 'Resized image near duplicate must be rejected');
    assert.ok(res.reasons.includes('NEAR_DUPLICATE_IMAGE'));
  });

  // TEST 5: Different image of same location and same civic incident => Semantic similarity + location
  await runTest('TEST 5: Different image of same location & incident => Semantic duplicate detected', async () => {
    const vecA = await generateImageEmbedding('drain-photo-front');
    const vecB = await generateImageEmbedding('drain-photo-side');

    const existingReports = [{
      id: 'REP-INCIDENT-ORIGINAL',
      category: 'Water & Sewage Issue',
      lat: 13.0820,
      lng: 80.2700,
      timestamp: new Date().toISOString(),
      embedding: vecA
    }];

    const newReport = {
      id: 'REP-INCIDENT-SIDE',
      category: 'Water & Sewage Issue',
      lat: 13.0822, // 22 meters away
      lng: 80.2701,
      device_id: 'dev-citizen-b'
    };

    const res = await runMultiLayerSpamCheck(newReport, 'drain-photo-side', {
      candidateReports: existingReports,
      mockEmbedding: vecA, // High similarity match
      mockFrequency: 0
    });

    assert.strictEqual(res.isSpam, true, 'Semantic duplicate at same incident location must be rejected');
    assert.ok(res.reasons.includes('SEMANTIC_DUPLICATE'));
  });

  // TEST 6: Two different potholes photographed separately => NOT automatically rejected solely because both are potholes
  await runTest('TEST 6: Two different potholes photographed separately => NOT rejected', async () => {
    const existingReports = [{
      id: 'REP-POTHOLE-DISTANT',
      category: 'Pothole & Surface Damage',
      lat: 13.0820,
      lng: 80.2700,
      timestamp: new Date().toISOString(),
      image_phash: '0000000000000000000000000000000000000000000000000000000000000000'
    }];

    const newReport = {
      id: 'REP-POTHOLE-FAR',
      category: 'Pothole & Surface Damage',
      lat: 13.1500, // 7.5 km away in different area
      lng: 80.3500,
      device_id: 'dev-driver-c'
    };

    const res = await runMultiLayerSpamCheck(newReport, 'different-pothole-photo', {
      candidateReports: existingReports,
      mockHash: '1111111111111111111111111111111111111111111111111111111111111111',
      mockFrequency: 0
    });

    assert.strictEqual(res.isSpam, false, 'Different potholes far apart must NOT be marked as spam');
  });

  // TEST 7: Two visually similar streetlights at different locations => NOT automatically rejected based on similarity
  await runTest('TEST 7: Visually similar streetlights at different locations => NOT rejected', async () => {
    const streetlightVector = new Array(512).fill(0.1);

    const existingReports = [{
      id: 'REP-LIGHT-LOCATION-A',
      category: 'Broken Streetlight',
      lat: 12.9800,
      lng: 80.2170, // Velachery
      timestamp: new Date().toISOString(),
      embedding: streetlightVector
    }];

    const newReport = {
      id: 'REP-LIGHT-LOCATION-B',
      category: 'Broken Streetlight',
      lat: 13.0827, // Anna Salai (12 km away)
      lng: 80.2707,
      device_id: 'dev-citizen-d'
    };

    const res = await runMultiLayerSpamCheck(newReport, 'similar-streetlight-photo', {
      candidateReports: existingReports,
      mockEmbedding: streetlightVector,
      mockFrequency: 0
    });

    assert.strictEqual(res.isSpam, false, 'Similar streetlights far apart must NOT be marked as spam');
  });

  // TEST 8: Sightengine moderation rejection => Report rejected before database insertion
  await runTest('TEST 8: Sightengine moderation rejection => Report rejected before DB insert', async () => {
    const inappropriateReport = {
      id: 'REP-INAPPROPRIATE',
      category: 'General Issue',
      lat: 13.08,
      lng: 80.27,
      device_id: 'dev-bad-user'
    };

    const res = await runMultiLayerSpamCheck(inappropriateReport, 'malicious-image', {
      mockSightengineResult: { isAcceptable: false, reason: 'SIGHTENGINE_MODERATION' },
      mockFrequency: 0
    });

    assert.strictEqual(res.isSpam, true, 'Report with inappropriate image must be rejected');
    assert.ok(res.reasons.includes('SIGHTENGINE_MODERATION'));
  });

  console.log(`\n===========================================================`);
  console.log(`Test Execution Complete: ${passed} passed, ${failed} failed.`);
  console.log(`===========================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

executeTestSuite();
