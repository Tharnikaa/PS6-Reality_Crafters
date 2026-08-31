const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/reports';

// Hotspot coordinate clusters in Chennai to produce realistic duplicates
const HOTSPOTS = {
  apollo_hospital: { lat: 13.0604, lng: 80.2496, name: "Greams Road near Apollo Children's Hospital, Thousand Lights" },
  tnagar_market:   { lat: 13.0415, lng: 80.2335, name: "Ranganathan Street near T. Nagar Bus Terminus" },
  velachery_hub:   { lat: 12.9800, lng: 80.2170, name: "Velachery Main Road near Bypass Junction" },
  mmc_hospital:    { lat: 13.0815, lng: 80.2720, name: "Poonamallee High Road near Madras Medical College, Park Town" },
  guindy_kathipara:{ lat: 13.0067, lng: 80.2030, name: "GST Road near Kathipara Junction, Guindy" },
  chromepet_gst:   { lat: 12.9516, lng: 80.1415, name: "GST Road near Chromepet Flyover & MIT Bridge" },
  mylapore_luz:    { lat: 13.0368, lng: 80.2676, name: "Luz Church Road near Mylapore Tank" },
  adyar_signal:    { lat: 13.0012, lng: 80.2565, name: "Lattice Bridge (LB) Road near Adyar Signal" },
  nungambakkam:    { lat: 13.0626, lng: 80.2405, name: "Nungambakkam High Road near Sterling Road Junction" },
  egmore_station:  { lat: 13.0784, lng: 80.2607, name: "Gandhi Irwin Road near Egmore Railway Station" },
  tambaram_mkt:    { lat: 12.9249, lng: 80.1000, name: "Shanmugam Road near Tambaram West Bus Stand" },
  koyambedu_mkt:   { lat: 13.0694, lng: 80.1948, name: "Koyambedu Wholesale Market Main Entrance Road" },
  sholinganallur:  { lat: 12.9010, lng: 80.2279, name: "OMR IT Corridor near Sholinganallur Signal" },
  porur_junction:  { lat: 13.0382, lng: 80.1565, name: "Arcot Road near Porur Roundtana Junction" }
};

// 50 realistic complaints with duplicates clustered around hotspots
const COMPLAINT_TEMPLATES = [
  // Cluster 1: Pothole at Apollo Hospital / Greams Rd (5 duplicates -> High/Critical Priority)
  { spot: 'apollo_hospital', desc: 'Huge crater-like pothole right outside hospital emergency entrance causing ambulance slowdown', cat: 'Pothole & Surface Damage', img: '/road_resolved.jpg', phone: '+91 98401 11001' },
  { spot: 'apollo_hospital', desc: 'Dangerous deep pothole on Greams road. Two-wheelers constantly skidding here', cat: 'Pothole & Surface Damage', img: '/road_resolved.jpg', phone: '+91 94440 22002' },
  { spot: 'apollo_hospital', desc: 'Broken asphalt and cave-in on Greams road near pediatric clinic', cat: 'Pothole & Surface Damage', img: '/road_resolved.jpg', phone: '+91 98840 33003' },
  { spot: 'apollo_hospital', desc: 'Severe road surface damage blocking traffic flow near hospital lane', cat: 'Pothole & Surface Damage', img: '/road_resolved.jpg', phone: '+91 97910 44004' },
  { spot: 'apollo_hospital', desc: 'Road crater expanding after recent rain, risk of fatal accident for bikes', cat: 'Pothole & Surface Damage', img: '/road_resolved.jpg', phone: '+91 91760 55005' },

  // Cluster 2: Garbage Overflow at T. Nagar (4 duplicates)
  { spot: 'tnagar_market', desc: 'Massive garbage pile overflowing from municipal bin onto pedestrian walking path', cat: 'Garbage Overflow', img: '/waste_resolved.jpg', phone: '+91 98412 12345' },
  { spot: 'tnagar_market', desc: 'Uncollected commercial waste and plastic boxes rotting on Ranganathan street', cat: 'Garbage Overflow', img: '/waste_resolved.jpg', phone: '+91 94451 23456' },
  { spot: 'tnagar_market', desc: 'Severe garbage overflow attracting stray cattle and foul odor across market', cat: 'Garbage Overflow', img: '/waste_resolved.jpg', phone: '+91 98845 34567' },
  { spot: 'tnagar_market', desc: 'Waste dump not cleared for 3 days, choking the street shop entrance', cat: 'Garbage Overflow', img: '/waste_resolved.jpg', phone: '+91 97101 45678' },

  // Cluster 3: Water & Sewage Leak at Velachery (4 duplicates)
  { spot: 'velachery_hub', desc: 'Drinking water pipeline ruptured, high volume clean water gushing onto main road', cat: 'Water & Sewage Issue', img: '/water_resolved.jpg', phone: '+91 98408 90123' },
  { spot: 'velachery_hub', desc: 'Underground water pipe burst flooding the entire left lane of bypass road', cat: 'Water & Sewage Issue', img: '/water_resolved.jpg', phone: '+91 94443 89012' },
  { spot: 'velachery_hub', desc: 'Severe water leak creating an artificial pond and traffic jam on Velachery road', cat: 'Water & Sewage Issue', img: '/water_resolved.jpg', phone: '+91 98842 78901' },
  { spot: 'velachery_hub', desc: 'Pipeline leakage weakening road foundation near bypass junction', cat: 'Water & Sewage Issue', img: '/water_resolved.jpg', phone: '+91 97909 67890' },

  // Cluster 4: Broken Streetlights at MMC / Park Town (3 duplicates)
  { spot: 'mmc_hospital', desc: 'Row of 4 LED streetlights completely dark along Poonamallee High Road', cat: 'Broken Streetlight', img: '/light_resolved.jpg', phone: '+91 98400 56789' },
  { spot: 'mmc_hospital', desc: 'Zero illumination at night outside Medical college gate, unsafe for nursing staff', cat: 'Broken Streetlight', img: '/light_resolved.jpg', phone: '+91 94449 45678' },
  { spot: 'mmc_hospital', desc: 'Damaged electrical cable box and non-functioning street lamp near junction', cat: 'Broken Streetlight', img: '/light_resolved.jpg', phone: '+91 98841 34567' },

  // Cluster 5: Kathipara Junction Potholes (3 duplicates)
  { spot: 'guindy_kathipara', desc: 'Multiple deep potholes right at the ramp ascending towards Guindy flyover', cat: 'Pothole & Surface Damage', img: '/road_resolved.jpg', phone: '+91 98415 67890' },
  { spot: 'guindy_kathipara', desc: 'Damaged expansion joint and asphalt pits on GST road near Kathipara circle', cat: 'Pothole & Surface Damage', img: '/road_resolved.jpg', phone: '+91 94445 78901' },
  { spot: 'guindy_kathipara', desc: 'Dangerous road crater at high-speed flyover merge point', cat: 'Pothole & Surface Damage', img: '/road_resolved.jpg', phone: '+91 98844 89012' },

  // Cluster 6: Sewage Overflow at Chromepet (3 duplicates)
  { spot: 'chromepet_gst', desc: 'Blocked manhole overflowing black sewage water across service road near MIT bridge', cat: 'Water & Sewage Issue', img: '/water_resolved.jpg', phone: '+91 98402 34567' },
  { spot: 'chromepet_gst', desc: 'Stagnant sewage water giving unbearable stench near Chromepet railway station', cat: 'Water & Sewage Issue', img: '/water_resolved.jpg', phone: '+91 94446 45678' },
  { spot: 'chromepet_gst', desc: 'Drainage blockage spilling onto pedestrian walkway near college bus stop', cat: 'Water & Sewage Issue', img: '/water_resolved.jpg', phone: '+91 98847 56789' },

  // Cluster 7: Garbage Pileup at Mylapore (3 duplicates)
  { spot: 'mylapore_luz', desc: 'Construction debris and coconut shells dumped illegally near temple tank perimeter', cat: 'Garbage Overflow', img: '/waste_resolved.jpg', phone: '+91 98406 11223' },
  { spot: 'mylapore_luz', desc: 'Solid waste heap uncleared for 48 hours near Luz corner vegetable shops', cat: 'Garbage Overflow', img: '/waste_resolved.jpg', phone: '+91 94447 22334' },
  { spot: 'mylapore_luz', desc: 'Debris and plastic bags overflowing from community waste bins', cat: 'Garbage Overflow', img: '/waste_resolved.jpg', phone: '+91 98848 33445' },

  // Cluster 8: Broken Streetlights at Adyar (2 duplicates)
  { spot: 'adyar_signal', desc: 'Flickering and dead sodium vapor streetlamp at busy pedestrian crossing', cat: 'Broken Streetlight', img: '/light_resolved.jpg', phone: '+91 98418 44556' },
  { spot: 'adyar_signal', desc: 'Pitch black road stretch near LB road signal causing near-misses for cyclists', cat: 'Broken Streetlight', img: '/light_resolved.jpg', phone: '+91 94448 55667' },

  // Cluster 9: Potholes at Nungambakkam (2 duplicates)
  { spot: 'nungambakkam', desc: 'Sharp pothole edges puncturing car tires near Sterling road turning', cat: 'Pothole & Surface Damage', img: '/road_resolved.jpg', phone: '+91 98409 66778' },
  { spot: 'nungambakkam', desc: 'Sunken stormwater drain grate creating sudden dip on main highway', cat: 'Pothole & Surface Damage', img: '/road_resolved.jpg', phone: '+91 94452 77889' },

  // Cluster 10: Drainage / Manhole at Koyambedu (3 duplicates)
  { spot: 'koyambedu_mkt', desc: 'Broken manhole slab with exposed iron rebar endangering trucks and loading tempos', cat: 'Water & Sewage Issue', img: '/water_resolved.jpg', phone: '+91 98410 88990' },
  { spot: 'koyambedu_mkt', desc: 'Open drainage ditch near flower market gate with no warning barricade', cat: 'Water & Sewage Issue', img: '/water_resolved.jpg', phone: '+91 94453 99001' },
  { spot: 'koyambedu_mkt', desc: 'Damaged culvert causing sewage backflow near wholesale vegetable gate', cat: 'Water & Sewage Issue', img: '/water_resolved.jpg', phone: '+91 98849 00112' },

  // Cluster 11: Garbage at Sholinganallur OMR (2 duplicates)
  { spot: 'sholinganallur', desc: 'E-waste and cafeteria food garbage dumped on OMR service lane near tech park', cat: 'Garbage Overflow', img: '/waste_resolved.jpg', phone: '+91 98413 11224' },
  { spot: 'sholinganallur', desc: 'Overflowing dumpsters spilling onto bike lane on IT expressway', cat: 'Garbage Overflow', img: '/waste_resolved.jpg', phone: '+91 94454 22335' },

  // Cluster 12: Streetlights at Porur (2 duplicates)
  { spot: 'porur_junction', desc: 'Overhead street lighting pole leaning dangerously over Arcot road', cat: 'Broken Streetlight', img: '/light_resolved.jpg', phone: '+91 98414 33446' },
  { spot: 'porur_junction', desc: 'Exposed high voltage wiring at the base of street lamp post', cat: 'Broken Streetlight', img: '/light_resolved.jpg', phone: '+91 94455 44557' },

  // Cluster 13: Water Leak at Tambaram (2 duplicates)
  { spot: 'tambaram_mkt', desc: 'Major municipal water valve leaking thousands of liters across market entrance', cat: 'Water & Sewage Issue', img: '/water_resolved.jpg', phone: '+91 98416 55668' },
  { spot: 'tambaram_mkt', desc: 'Drinking water distribution line split open near railway foot overbridge', cat: 'Water & Sewage Issue', img: '/water_resolved.jpg', phone: '+91 94456 66779' },

  // Individual / Unique Reports across Chennai
  { spot: 'egmore_station', desc: 'Cracked concrete slab on platform exit road causing pedestrian trips', cat: 'Pothole & Surface Damage', img: '/road_resolved.jpg', phone: '+91 98417 77880' },
  { spot: 'egmore_station', desc: 'Foul garbage dump outside parcel office building attracting stray dogs', cat: 'Garbage Overflow', img: '/waste_resolved.jpg', phone: '+91 94457 88991' },
  { spot: 'porur_junction', desc: 'Pothole cluster under construction metro pier on Arcot road', cat: 'Pothole & Surface Damage', img: '/road_resolved.jpg', phone: '+91 98419 99002' },
  { spot: 'sholinganallur', desc: 'High mast light out of order at Sholinganallur main roundabout', cat: 'Broken Streetlight', img: '/light_resolved.jpg', phone: '+91 94458 00113' },
  { spot: 'koyambedu_mkt', desc: 'Foul-smelling rotten vegetable debris blocking truck bay 4', cat: 'Garbage Overflow', img: '/waste_resolved.jpg', phone: '+91 98420 11225' },
  { spot: 'nungambakkam', desc: 'Street lamp pole damaged after tree branch fall during storm', cat: 'Broken Streetlight', img: '/light_resolved.jpg', phone: '+91 94459 22336' },
  { spot: 'adyar_signal', desc: 'Sewage inspection chamber overflowing into stormwater gutter', cat: 'Water & Sewage Issue', img: '/water_resolved.jpg', phone: '+91 98421 33447' },
  { spot: 'mylapore_luz', desc: 'Deep trench dug for utility cables left unpaved with sharp gravel', cat: 'Pothole & Surface Damage', img: '/road_resolved.jpg', phone: '+91 94460 44558' },
  { spot: 'chromepet_gst', desc: 'Street light circuit breaker tripping every night leaving entire stretch dark', cat: 'Broken Streetlight', img: '/light_resolved.jpg', phone: '+91 98422 55669' },
  { spot: 'guindy_kathipara', desc: 'Fallen road divider curb stone obstructing left turn into airport lane', cat: 'Pothole & Surface Damage', img: '/road_resolved.jpg', phone: '+91 94461 66780' },
  { spot: 'mmc_hospital', desc: 'Broken water fountain and leaking supply pipe inside public hospital campus road', cat: 'Water & Sewage Issue', img: '/water_resolved.jpg', phone: '+91 98423 77891' },
  { spot: 'velachery_hub', desc: 'Garbage bins overturned by stray animals scattering plastic onto road', cat: 'Garbage Overflow', img: '/waste_resolved.jpg', phone: '+91 94462 88902' },
  { spot: 'tnagar_market', desc: 'Exposed live streetlight cable near bus stop shelter where commuters wait', cat: 'Broken Streetlight', img: '/light_resolved.jpg', phone: '+91 98424 99013' }
];

async function seedComplaints() {
  console.log(`=======================================================`);
  console.log(`Starting Dynamic Ingestion of 50 Citizen Complaints...`);
  console.log(`=======================================================\n`);

  let count = 0;
  let duplicatesMerged = 0;
  let newMasterTickets = 0;

  for (let i = 0; i < COMPLAINT_TEMPLATES.length; i++) {
    const item = COMPLAINT_TEMPLATES[i];
    const spot = HOTSPOTS[item.spot] || HOTSPOTS.apollo_hospital;

    // Add slight random GPS jitter (+- 0.00015 deg ~ 15m) to simulate realistic citizen phone GPS
    const jitterLat = spot.lat + (Math.random() - 0.5) * 0.0003;
    const jitterLng = spot.lng + (Math.random() - 0.5) * 0.0003;

    const payload = {
      description: item.desc,
      location: spot.name,
      lat: jitterLat.toFixed(6),
      lng: jitterLng.toFixed(6),
      reporterPhone: item.phone,
      imageUrl: item.img,
      device_id: `citizen-device-${1000 + i}`
    };

    try {
      const response = await axios.post(API_BASE, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-jwt-token'
        },
        timeout: 10000
      });

      count++;
      const rep = response.data.report || {};
      const isDup = response.data.isDuplicate;

      if (isDup) {
        duplicatesMerged++;
      } else {
        newMasterTickets++;
      }

      console.log(
        `[${String(count).padStart(2, '0')}/50] ${rep.id || 'REP'} | ${item.cat.padEnd(26)} | ` +
        `Sev: ${rep.severity || 3}/5 | DupCount: ${rep.duplicatesCount || 1} | ` +
        `Pri: ${(rep.priorityLevel || 'LOW').padEnd(8)} | Score: ${rep.priorityScore || 0} | ${spot.name.slice(0, 35)}...`
      );
    } catch (err) {
      console.error(`[ERR] Failed to submit report #${i + 1}:`, err.response ? err.response.data : err.message);
    }
  }

  console.log(`\n=======================================================`);
  console.log(` Dynamic Ingestion Complete!`);
  console.log(` Total Complaints Processed: ${count}`);
  console.log(` Master Issues Created:      ${newMasterTickets}`);
  console.log(` Duplicate Reports Merged:   ${duplicatesMerged}`);
  console.log(`=======================================================`);
}

seedComplaints();
