async function runTests() {
  try {
    console.log("=== Testing Health Check & Helmet Headers ===");
    const healthRes = await fetch('http://localhost:8002/api/health');
    console.log("Status:", healthRes.status);
    console.log("Headers:");
    for (const [key, value] of healthRes.headers.entries()) {
      if ([
        'content-security-policy',
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'strict-transport-security'
      ].includes(key.toLowerCase())) {
        console.log(`  ${key}: ${value}`);
      }
    }

    console.log("\n=== Testing AI Endpoint (Valid message payload) ===");
    const validAiRes = await fetch('http://localhost:8002/api/ai/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Hello AI, please confirm you are online." })
    });
    console.log("Status:", validAiRes.status);
    const validAiData = await validAiRes.json();
    console.log("Response:", validAiData);

    console.log("\n=== Testing AI Endpoint (Invalid/Missing message) ===");
    const invalidAiRes = await fetch('http://localhost:8002/api/ai/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    console.log("Status:", invalidAiRes.status);
    const invalidAiData = await invalidAiRes.json();
    console.log("Response:", JSON.stringify(invalidAiData, null, 2));

    console.log("\n=== Testing Diagram Endpoint (Invalid/Malformed PlantUML) ===");
    const invalidDiagRes = await fetch('http://localhost:8002/api/ai/diagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagram: "not_a_plantuml" })
    });
    console.log("Status:", invalidDiagRes.status);
    const invalidDiagData = await invalidDiagRes.json();
    console.log("Response:", JSON.stringify(invalidDiagData, null, 2));

    console.log("\n=== Testing HTML Sanitization on AI Endpoint ===");
    const xssAiRes = await fetch('http://localhost:8002/api/ai/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "<script>alert(1)</script>Safe Text" })
    });
    console.log("Status:", xssAiRes.status);
    const xssAiData = await xssAiRes.json();
    console.log("Response (HTML tags should be stripped):", xssAiData);

  } catch (err) {
    console.error("Test failed:", err);
  }
}

runTests();
