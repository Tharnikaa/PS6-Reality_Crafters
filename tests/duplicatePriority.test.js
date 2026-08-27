const assert = require('assert');
const {
  calculateDistanceMeters,
  calculateReportCountScore,
  calculateLocationScore,
  getTrafficLevel,
  calculateTrafficScore,
  calculateFinalPriority,
  findDuplicateReport
} = require('../server');

console.log('===========================================================');
console.log('=== Running Duplicate Report Merging & Priority Tests  ===');
console.log('===========================================================');

// 1. Distance Test (Haversine meters)
const lat1 = 13.060400, lng1 = 80.249600;
const lat2 = 13.060500, lng2 = 80.249700;
const dist = calculateDistanceMeters(lat1, lng1, lat2, lng2);
assert(dist <= 100, `Distance should be <= 100m (Actual: ${dist.toFixed(2)}m)`);
console.log(`✓ [PASSED] Test 1: Distance calculation between (13.0604, 80.2496) and (13.0605, 80.2497) = ${dist.toFixed(2)} meters`);

// 2. Report Count Score Test
assert.strictEqual(calculateReportCountScore(1), 0);
assert.strictEqual(calculateReportCountScore(2), 1);
assert.strictEqual(calculateReportCountScore(3), 1);
assert.strictEqual(calculateReportCountScore(4), 2);
assert.strictEqual(calculateReportCountScore(5), 2);
assert.strictEqual(calculateReportCountScore(6), 3);
assert.strictEqual(calculateReportCountScore(10), 3);
console.log('✓ [PASSED] Test 2: Report count score progression (1 -> +0, 2-3 -> +1, 4-5 -> +2, 6+ -> +3)');

// 3. Location Score Test
assert.strictEqual(calculateLocationScore('Anna Salai near Apollo Hospital', 'Hospital Zone', 'Critical'), 3);
assert.strictEqual(calculateLocationScore('DAV School Street, Velachery', 'School Zone', 'High'), 2);
assert.strictEqual(calculateLocationScore('Residential Street', 'Community Zone', 'Standard'), 0);
console.log('✓ [PASSED] Test 3: Location sensitivity score (Hospital -> +3, School -> +2, Normal -> +0)');

// 4. Traffic Level & Score Test
assert.strictEqual(getTrafficLevel('Anna Salai Signal'), 'HIGH');
assert.strictEqual(calculateTrafficScore('HIGH'), 2);
assert.strictEqual(getTrafficLevel('Quiet Lane'), 'LOW');
assert.strictEqual(calculateTrafficScore('LOW'), 0);
console.log('✓ [PASSED] Test 4: Traffic level & score helper (Signal/Junction -> HIGH/+2, Lane -> LOW/+0)');

// 5. Final Priority Calculation & Dynamic Escalation Test
const report1Priority = calculateFinalPriority({
  severity: 3,
  duplicatesCount: 1,
  zoneType: 'Community Zone',
  location: 'Anna Salai Signal'
});
// Severity 3 + Report 0 + Location 0 + Traffic 2 = Score 5 -> Medium Priority
assert.strictEqual(report1Priority.priority, 'Medium Priority');
assert.strictEqual(report1Priority.priorityScore, 5);
console.log(`✓ [PASSED] Test 5: First Report (Severity 3, 1 report, High Traffic) => ${report1Priority.priority} (Score ${report1Priority.priorityScore})`);

const report5Priority = calculateFinalPriority({
  severity: 3,
  duplicatesCount: 5,
  zoneType: 'Community Zone',
  location: 'Anna Salai Signal'
});
// Severity 3 + Report +2 + Location 0 + Traffic 2 = Score 7 -> High Priority
assert.strictEqual(report5Priority.priority, 'High Priority');
assert.strictEqual(report5Priority.priorityScore, 7);
console.log(`✓ [PASSED] Test 6: Fifth Report Dynamic Recalculation (5 reports) => Escalates to ${report5Priority.priority} (Score ${report5Priority.priorityScore})`);

const hospitalCase = calculateFinalPriority({
  severity: 4,
  duplicatesCount: 5,
  zoneType: 'Hospital & Healthcare Zone',
  zoneSensitivity: 'Critical',
  location: 'Apollo Hospital Gate, Greams Road Signal'
});
// Severity 4 + Report +2 + Location +3 + Traffic +2 = Score 11 -> Critical Priority
assert.strictEqual(hospitalCase.priority, 'Critical Priority');
assert.strictEqual(hospitalCase.priorityScore, 11);
console.log(`✓ [PASSED] Test 7: Hospital Zone + 5 Reports + High Traffic => Escalates to ${hospitalCase.priority} (Score ${hospitalCase.priorityScore})`);

// 6. Category Matching Protection Test
const existingOpenReports = [
  { id: 'REP-101', category: 'Pothole & Surface Damage', lat: 13.0604, lng: 80.2496, status: 'Pending' },
  { id: 'REP-102', category: 'Garbage Overflow', lat: 13.0604, lng: 80.2496, status: 'Pending' }
];

const newPothole = { id: 'REP-103', category: 'Pothole & Surface Damage', lat: 13.0605, lng: 80.2497 };
const matched = findDuplicateReport(newPothole, existingOpenReports);
assert.strictEqual(matched.id, 'REP-101');
console.log('✓ [PASSED] Test 8: Duplicate detector matches same category ("Pothole & Surface Damage") within 100m');

const newGarbage = { id: 'REP-104', category: 'Garbage Overflow', lat: 13.0605, lng: 80.2497 };
const matchedGarbage = findDuplicateReport(newGarbage, existingOpenReports);
assert.strictEqual(matchedGarbage.id, 'REP-102');
console.log('✓ [PASSED] Test 9: Category protection prevents merging "Garbage Overflow" into "Pothole & Surface Damage" at same location');

// 7. Resolved Issue Protection Test
const resolvedReports = [
  { id: 'REP-201', category: 'Pothole & Surface Damage', lat: 13.0604, lng: 80.2496, status: 'Resolved' }
];
const newReportAfterResolution = { id: 'REP-202', category: 'Pothole & Surface Damage', lat: 13.0605, lng: 80.2497 };
const matchedResolved = findDuplicateReport(newReportAfterResolution, resolvedReports);
assert.strictEqual(matchedResolved, null);
console.log('✓ [PASSED] Test 10: Resolved issues are NOT merged into; new complaint creates fresh Master Issue');

console.log('===========================================================');
console.log('All 10 Duplicate & Dynamic Priority Unit Tests Passed Successfully!');
console.log('===========================================================');
