const email = "jtsadmin@gmail.com";
const password = "jts@123";

async function test() {
  const loginRes = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  const statsRes = await fetch("http://localhost:5000/api/procurement/stats", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  if (!statsRes.ok) {
    const errText = await statsRes.text();
    console.error(`Status ${statsRes.status}: ${errText}`);
  } else {
    const statsData = await statsRes.json();
    console.log("Success:", JSON.stringify(statsData, null, 2));
  }
}
test();
