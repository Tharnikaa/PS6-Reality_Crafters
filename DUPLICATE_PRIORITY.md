# Low-Level Duplicate Detection & Priority Triage Logic

This document explains the backend features implemented for detecting duplicate civic issue reports and calculating report priorities. The implementation uses low-level, pure JavaScript and Express.js logic, without complex third-party spatial databases or machine learning libraries, making it easy to understand and present.

---

## 1. How Duplicate Detection Works

When a citizen submits a new report, the backend processes it through a triage pipeline:

1. **Category Check**: The new report's category is compared with existing active issues. Only reports with the exact same category (e.g., "Pothole & Surface Damage" vs "Pothole & Surface Damage") are considered potential duplicates.
2. **Proximity Check**: If the categories match, the backend calculates the geodetic distance between the new report's GPS coordinates (latitude/longitude) and the coordinates of the existing issues.
3. **Clustering Decision**:
   - If an issue of the **same category** is found within **100 meters**, it is classified as a duplicate. The report is grouped under the existing **Issue Cluster** (`issue_id` is linked), and the issue's report count increases by 1.
   - If no duplicate issue is found within 100 meters, a **new Issue Cluster** is created, and the report is linked to it.

---

## 2. What the Haversine Formula Does

The **Haversine formula** calculates the shortest distance over the earth's surface between two points given their latitudes and longitudes. Since the earth is a sphere, we cannot use simple 2D Euclidean geometry ($d = \sqrt{dx^2 + dy^2}$).

### JavaScript Implementation:
```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters (6,371 km)
  
  // Convert degrees to radians
  const radLat1 = lat1 * Math.PI / 180;
  const radLat2 = lat2 * Math.PI / 180;
  const deltaLat = (lat2 - lat1) * Math.PI / 180;
  const deltaLon = (lon2 - lon1) * Math.PI / 180;

  // Apply Haversine formula
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(radLat1) * Math.cos(radLat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Returns distance in meters
}
```
* **$R$**: Earth's radius in meters.
* **$\Delta\text{lat}$ and $\Delta\text{lon}$**: Diff in coordinates converted to radians.
* **$a$**: Represents the square of half the chord length between the points.
* **$c$**: Represents the angular distance in radians.
* **$R \times c$**: Converts angular distance to physical meters.

---

## 3. Why 100 Meters is Used

A threshold of **100 meters** is used for duplicate detection because:
- **GPS Accuracies**: Mobile geolocations have an accuracy range of 5–15 meters under normal outdoor conditions.
- **Reporting Variations**: Multiple citizens reporting the same pothole or garbage pile might stand on opposite sides of the street or walk slightly past it before submitting, leading to coordinate differences.
- **Tolerable Range**: 100 meters safely covers these variations without erroneously merging different issues on the same long avenue.

---

## 4. How Report Count Affects Priority

The number of citizens reporting the same issue indicates its urgency and community impact. The report count is converted to a score using a non-linear scale:

- **1 report** $\rightarrow$ **20 points**
- **2 reports** $\rightarrow$ **40 points**
- **3 reports** $\rightarrow$ **60 points**
- **4 reports** $\rightarrow$ **75 points**
- **5 reports** $\rightarrow$ **90 points**
- **6+ reports** $\rightarrow$ **100 points**

This score contributes **50%** of the final priority calculation.

---

## 5. How Nearby School/Hospital Detection Works

To protect vulnerable populations, issues close to schools or hospitals are prioritized.

1. The backend maintains a list of known facility coordinates (`sampleFacilities`).
2. It calculates the distance between the issue's coordinates and every facility.
3. If any school or hospital is within **500 meters**, it flags the issue as having a nearby facility.
4. **Scoring**:
   - Facility nearby $\rightarrow$ **100 points**
   - No facility nearby $\rightarrow$ **0 points**

This score contributes **30%** of the final priority calculation.

---

## 6. How Traffic Classification Works

Issues on busy roads cause massive delays and hazard risks.
1. The backend analyzes the report's address/location string.
2. It checks for high-traffic keywords: `'salai'`, `'bypass'`, `'highway'`, `'main rd'`, `'main road'`, `'expressway'`, `'arterial'`.
3. **Scoring**:
   - Location matches keywords $\rightarrow$ **100 points** (High Traffic Area)
   - Otherwise $\rightarrow$ **0 points** (Normal Traffic)

This score contributes **20%** of the final priority calculation.

---

## 7. How the Priority Formula Works

The final priority score is a weighted average of the three components:

$$\text{Final Score} = (\text{Report Score} \times 0.50) + (\text{Facility Score} \times 0.30) + (\text{Traffic Score} \times 0.20)$$

### Mapping Score to Priority Level:
- **80–100** $\rightarrow$ **CRITICAL**
- **60–79** $\rightarrow$ **HIGH**
- **40–59** $\rightarrow$ **MEDIUM**
- **0–39** $\rightarrow$ **LOW**

---

## 8. Example Calculation

Consider an issue with the following profile:
* **Report Count**: 5 reports $\rightarrow$ **90 points**
* **Facility**: Close to Apollo Children's Hospital (320m away) $\rightarrow$ **100 points**
* **Traffic**: Located on "Anna Salai Road" $\rightarrow$ **100 points**

### Math Calculation:
$$\text{Final Score} = (90 \times 0.50) + (100 \times 0.30) + (100 \times 0.20)$$
$$\text{Final Score} = 45 + 30 + 20 = 95$$

The final score is **95**, placing it in the **CRITICAL** category. This issue will float to the very top of the municipal queue.
