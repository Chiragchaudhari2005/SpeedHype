import http from 'http';

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/health',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:', data);
    
    // Check CORS headers
    console.log('CORS Headers:');
    console.log('Access-Control-Allow-Origin:', res.headers['access-control-allow-origin']);
    console.log('Access-Control-Allow-Credentials:', res.headers['access-control-allow-credentials']);
    
    // Test auth endpoint without token
    const authOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    const authReq = http.request(authOptions, (authRes) => {
      console.log(`\nAuth Endpoint Status (no token): ${authRes.statusCode}`);
      process.exit(0);
    });
    
    authReq.on('error', (err) => {
      console.error('Auth request error:', err);
      process.exit(1);
    });
    
    authReq.end();
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
  process.exit(1);
});

req.end();