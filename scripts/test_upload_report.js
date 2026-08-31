const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

async function testUpload() {
  const form = new FormData();
  form.append('description', 'Large deep pothole on the road creating hazard for vehicles');
  form.append('location', 'Anna Salai near Mount Road, Chennai');
  form.append('lat', '13.0604');
  form.append('lng', '80.2496');
  form.append('reporterPhone', '+91 9876543210');
  form.append('device_id', `device-test-${Date.now()}`);

  const imagePath = path.join(__dirname, '..', 'pics', 'potholes.png');
  form.append('image', fs.createReadStream(imagePath));

  try {
    console.log('Sending multipart POST request to http://localhost:3000/api/reports ...');
    const response = await axios.post('http://localhost:3000/api/reports', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer demo-jwt-token'
      }
    });

    console.log('\n--- Server Response ---');
    console.log('Status Code:', response.status);
    console.log('Response Body:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error('Request failed with status:', error.response.status);
      console.error('Error details:', error.response.data);
    } else {
      console.error('Connection error:', error.message);
    }
  }
}

testUpload();
