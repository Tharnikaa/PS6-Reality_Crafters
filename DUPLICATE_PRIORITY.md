# Duplicate Detection & Priority Triage — System Documentation

This document explains every step of the CivicResolve triage
pipeline in plain language. It is written for students who need
to understand and explain the logic to hackathon judges.

---

## 1. Complete Flow of the System

```
Citizen submits a report
         ↓
POST /api/reports receives:
  category, description, latitude, longitude,
  location, image, reporter phone
         ↓
Upload image → Supabase Storage
         ↓
Classify category from description keywords
         ↓
INSERT report into civic_reports (safe defaults)
  ← Report is ALWAYS saved first ←
         ↓
Fetch existing open reports of the same category
         ↓
Loop through each existing report:
  ├─ Same category? → YES → continue
  │                → NO  → skip
  ├─ Status = Resolved? → YES → skip (old fixed issue)
  │                     → NO  → continue
  └─ Distance ≤ 100 m?  → YES → duplicate found
                         → NO  → not a duplicate
         ↓
duplicateCount = number of duplicates found + 1 (this new report)
         ↓
Check nearby school / hospital (within 500 m)
         ↓
Check high-traffic road (keyword search in location string)
         ↓
Calculate reportScore   (based on duplicateCount)
Calculate facilityScore (100 if school/hospital nearby, else 0)
Calculate trafficScore  (100 if major road, else 0)
         ↓
priorityScore = (reportScore × 0.50)
              + (facilityScore × 0.30)
              + (trafficScore  × 0.20)
         ↓
Map score → priorityLevel (CRITICAL / HIGH / MEDIUM / LOW)
Map level → severity (5 / 4 / 3 / 2) for colour badges
         ↓
UPDATE new report in database with all calculated fields
UPDATE all duplicate reports with new duplicateCount + priority
         ↓
Return enriched JSON response to frontend
```

---

## 2. How Duplicate Detection Works

When a new report arrives the backend:

1. Fetches all **open** reports of the **same category**.
2. Loops through each one.
3. Compares it with the new report using two filters:

   **Filter A — Category must match**

   A pothole and a garbage pile 10 metres apart are
   *different problems* handled by *different departments*.
   Only identical categories can be duplicates.

   **Filter B — Distance must be ≤ 100 metres**

   The backend calculates the real-world geographic distance
   between the two GPS coordinates using the Haversine formula.
   If the distance is 100 metres or less, the reports are
   considered to be about the same physical issue.

4. All matching reports are collected into a `duplicateReports` array.

---

## 3. Why 100 Metres is Used

| Reason | Detail |
|---|---|
| **GPS accuracy** | Phones have 5–15 m accuracy outdoors |
| **Reporting position** | Citizens might report from across the street (+10–20 m) |
| **Same road section** | A pothole affects a ~30 m stretch of road |
| **Safety margin** | 100 m covers all of the above without merging truly different issues |

100 metres is approximately the length of a football pitch.
Two potholes 250 m apart are likely different problems; two
potholes 40 m apart almost certainly the same one.

---

## 4. Haversine Formula

The earth is a sphere. Simple flat geometry cannot measure
distances between GPS coordinates correctly. The Haversine
formula calculates the shortest path along the curved surface
of the earth.

### JavaScript Implementation

```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's mean radius in metres

  // Step 1: Convert degrees to radians
  // Math.sin / Math.cos need radians, not degrees
  const radLat1  = (lat1 * Math.PI) / 180;
  const radLat2  = (lat2 * Math.PI) / 180;

  // Step 2: Calculate the differences
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  // Step 3: Haversine formula
  // 'a' = square of half the chord length between the points
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  // Step 4: Angular distance in radians
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Step 5: Convert to metres
  return R * c;
}
```

### Variable Meanings

| Variable | Meaning |
|---|---|
| `R` | Earth's radius (6,371,000 metres) |
| `deltaLat` | Latitude difference converted to radians |
| `deltaLon` | Longitude difference converted to radians |
| `a` | Square of half the chord length |
| `c` | Angular distance in radians |
| `R × c` | Physical distance in metres |

---

## 5. How Duplicate Count is Calculated

```javascript
// findDuplicateReports() returns the array of matching reports
const duplicateReports = findDuplicateReports(newReport, existingReports);

// +1 includes the new report itself in the total count
const duplicateCount = duplicateReports.length + 1;
```

### Example

Five citizens report the same pothole:

| Report | Action |
|---|---|
| REP-001 | Saved. No existing reports → duplicateCount = 1 |
| REP-002 | Within 100 m of REP-001 → duplicateCount = 2 |
| REP-003 | Within 100 m of REP-001 → duplicateCount = 3 |
| REP-004 | Within 100 m of REP-001 → duplicateCount = 4 |
| REP-005 | Within 100 m of REP-001 → duplicateCount = 5 |

After REP-005 is submitted, **all five reports** are updated:

```
REP-001 → duplicates_count = 5,  severity = 5 (CRITICAL)
REP-002 → duplicates_count = 5,  severity = 5 (CRITICAL)
REP-003 → duplicates_count = 5,  severity = 5 (CRITICAL)
REP-004 → duplicates_count = 5,  severity = 5 (CRITICAL)
REP-005 → duplicates_count = 5,  severity = 5 (CRITICAL)
```

---

## 6. How School / Hospital Detection Works

```javascript
function findNearbyFacility(lat, lng) {
  const FACILITY_RADIUS_METRES = 500;
  let closestFacility = null;
  let closestDistance = FACILITY_RADIUS_METRES;

  for (const facility of knownFacilities) {
    const dist = calculateDistance(lat, lng, facility.lat, facility.lng);

    if (dist <= FACILITY_RADIUS_METRES && dist < closestDistance) {
      closestDistance = dist;
      closestFacility = facility;
    }
  }
  ...
}
```

The `knownFacilities` array contains the GPS coordinates of
known schools and hospitals in the city. The function loops
through all of them, calculates the distance from the report,
and returns the **nearest** one within 500 metres.

---

## 7. Why 500 Metres is Used

500 metres is approximately a 6-minute walk.

A civic issue 500 m from a hospital (e.g. a flooded road or
large pothole) can delay ambulances and put patients at risk.
A broken streetlight 400 m from a school is a safety hazard
for children walking home.

Issues within this range are treated as higher priority.

---

## 8. How Traffic Classification Works

> **Important:** This is **road-type** classification, not
> real-time traffic data. No live traffic API is used.

The function searches the location string for keywords that
indicate a major road:

```javascript
const highTrafficKeywords = [
  'salai',      // Tamil word for road/avenue (e.g. Anna Salai)
  'bypass',
  'highway',
  'main rd',
  'main road',
  'expressway',
  'arterial'
];
```

If any keyword is found → `high_traffic_area = true`

### Why keywords work well

Most major roads in Chennai include "salai" in their name
(Anna Salai, Arcot Salai, Poonamallee High Road, etc.).
National and state highways always contain "highway" or "bypass".

This approach needs no external API and is accurate enough
for a prototype.

---

## 9. Priority Weights

| Factor | Weight | Score range | Meaning |
|---|---|---|---|
| Report Count | **50%** | 20–100 | Community urgency |
| Nearby Facility | **30%** | 0 or 100 | Vulnerable people at risk |
| High Traffic Road | **20%** | 0 or 100 | Road safety / traffic impact |

**Report count gets the highest weight (50%)** because the
number of independent citizens reporting the same issue is the
strongest signal of how urgent and impactful the problem is.

**Facility proximity gets 30%** because issues near hospitals
and schools directly endanger vulnerable people.

**Traffic classification gets 20%** because congestion and
accidents on main roads have a city-wide impact.

---

## 10. Priority Formula

```
priorityScore = (reportScore  × 0.50)
              + (facilityScore × 0.30)
              + (trafficScore  × 0.20)
```

All three scores are between 0 and 100.
The final priorityScore is also between 0 and 100.

---

## 11. Priority Levels

| Score range | Priority Level | Severity badge |
|---|---|---|
| 80 – 100 | **CRITICAL** | 5 (red) |
| 60 – 79  | **HIGH**     | 4 (orange) |
| 40 – 59  | **MEDIUM**   | 3 (amber) |
| 0  – 39  | **LOW**      | 2 (lime green) |

The `severity` number is stored in the database and used by
the frontend to select the badge colour on each report card.

---

## 12. Example Calculations

### Example A — CRITICAL (Test F from specification)

**Scenario:** 5 citizens report the same pothole.
Hospital within 500 m. Issue on a main road.

| Factor | Value | Score |
|---|---|---|
| 5 reports | `calculateReportScore(5)` | **90** |
| Hospital nearby | facilityScore | **100** |
| Main road | trafficScore | **100** |

```
priorityScore = (90 × 0.50) + (100 × 0.30) + (100 × 0.20)
              =  45          +  30           +  20
              = 95
```

`getPriorityLevel(95)` → **CRITICAL**
`mapPriorityToSeverity('CRITICAL')` → **5** (red badge)

---

### Example B — LOW (Test G from specification)

**Scenario:** 1 report. No nearby facility. Residential road.

| Factor | Value | Score |
|---|---|---|
| 1 report | `calculateReportScore(1)` | **20** |
| No facility | facilityScore | **0** |
| Local road | trafficScore | **0** |

```
priorityScore = (20 × 0.50) + (0 × 0.30) + (0 × 0.20)
              =  10          +  0          +  0
              = 10
```

`getPriorityLevel(10)` → **LOW**
`mapPriorityToSeverity('LOW')` → **2** (lime green badge)

---

### Example C — HIGH

**Scenario:** 3 reports. School nearby. Normal road.

| Factor | Value | Score |
|---|---|---|
| 3 reports | `calculateReportScore(3)` | **60** |
| School nearby | facilityScore | **100** |
| Local road | trafficScore | **0** |

```
priorityScore = (60 × 0.50) + (100 × 0.30) + (0 × 0.20)
              =  30          +  30           +  0
              = 60
```

`getPriorityLevel(60)` → **HIGH**
`mapPriorityToSeverity('HIGH')` → **4** (orange badge)

---

*All logic is implemented in plain JavaScript functions inside
`server.js` using only Express.js, Supabase, and basic maths.*
