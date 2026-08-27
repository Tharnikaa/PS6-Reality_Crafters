const assert = require('assert');
const { classifyReport } = require('../server');

const testCases = [
  { input: "Pothole", expected: "road_and_highways" },
  { input: "Damaged road", expected: "road_and_highways" },
  { input: "Damaged footpath", expected: "road_and_highways" },
  { input: "Traffic signal", expected: "road_and_highways" },
  { input: "Water leak", expected: "water_and_sewage" },
  { input: "Overflowing drain", expected: "water_and_sewage" },
  { input: "Sewage issue", expected: "water_and_sewage" },
  { input: "Broken streetlight", expected: "electrical" },
  { input: "Electrical infrastructure", expected: "electrical" },
  { input: "Unrelated/unclear issue", expected: "other" }
];

console.log("=== Running AI Categorization Unit Tests ===");
let passed = 0;
let failed = 0;

testCases.forEach(({ input, expected }, index) => {
  const result = classifyReport(input);
  const categoryCode = result.categoryCode || result.departmentKey;
  if (categoryCode === expected) {
    console.log(`✓ Test ${index + 1}: "${input}" -> ${categoryCode}`);
    passed++;
  } else {
    console.error(`✗ Test ${index + 1}: "${input}" -> Got "${categoryCode}", expected "${expected}"`);
    failed++;
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All categorization test cases passed successfully!");
}
