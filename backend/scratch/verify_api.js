async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/departments?websiteId=69c2a29b587dc977e619d212');
    console.log('API Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
    } else {
      const text = await res.text();
      console.log('Error response:', text);
    }
  } catch (err) {
    console.error('Failed to contact backend API:', err.message);
  }
}

test();
