async function test() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('http://127.0.0.1:5000/health', { signal: controller.signal });
    clearTimeout(timeout);
    console.log('STATUS:', res.status);
    const json = await res.json();
    console.log('BODY:', json);
  } catch (err) {
    console.log('ERROR:', err.message);
  }
}

test();
