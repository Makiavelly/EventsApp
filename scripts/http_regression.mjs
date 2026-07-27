const baseURL = process.argv[2] ?? "http://127.0.0.1:8080/api/v1";
const runID = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
const passwordEmail = `remediation-password-${runID}@gmail.com`;
const nameEmail = `remediation-name-${runID}@gmail.com`;
const cleanupAccounts = new Map();

try {
  const first = await register(passwordEmail, "old-secret");
  cleanupAccounts.set(first.user.id, {
    token: first.token,
    email: passwordEmail,
    password: "old-secret",
  });
  const second = await login(passwordEmail, "old-secret");

  const newPassword = "new-secret";
  await request(`/users/${first.user.id}`, {
    method: "PATCH",
    token: first.token,
    body: { password: newPassword },
    expectedStatus: 200,
  });
  cleanupAccounts.get(first.user.id).password = newPassword;

  for (const authentication of [first, second]) {
    await request("/auth/me", {
      token: authentication.token,
      expectedStatus: 401,
    });
    await request("/auth/refresh", {
      method: "POST",
      cookie: authentication.cookie,
      expectedStatus: 401,
    });
  }
  await request("/auth/login", {
    method: "POST",
    body: { email: passwordEmail, password: "old-secret" },
    expectedStatus: 401,
  });
  const relogged = await login(passwordEmail, newPassword);
  cleanupAccounts.get(relogged.user.id).token = relogged.token;

  const nameSessionOne = await register(nameEmail, "secret12");
  cleanupAccounts.set(nameSessionOne.user.id, {
    token: nameSessionOne.token,
    email: nameEmail,
    password: "secret12",
  });
  const nameSessionTwo = await login(nameEmail, "secret12");
  const renamed = await request(`/users/${nameSessionOne.user.id}`, {
    method: "PATCH",
    token: nameSessionOne.token,
    body: { name: "Renamed integration user" },
    expectedStatus: 200,
  });
  assert(
    renamed.body.name === "Renamed integration user",
    "name-only PATCH returned the old name",
  );
  for (const authentication of [nameSessionOne, nameSessionTwo]) {
    await request("/auth/me", {
      token: authentication.token,
      expectedStatus: 200,
    });
    await request("/auth/refresh", {
      method: "POST",
      cookie: authentication.cookie,
      expectedStatus: 200,
    });
  }

  await request(`/users/${nameSessionOne.user.id}`, {
    method: "PATCH",
    token: relogged.token,
    body: { name: "Forbidden rename" },
    expectedStatus: 403,
  });
  await request(`/users/${nameSessionOne.user.id}`, {
    method: "DELETE",
    token: relogged.token,
    expectedStatus: 403,
  });

  const created = await request("/events", {
    method: "POST",
    token: nameSessionOne.token,
    body: {
      title: "Concurrent HTTP event",
      description: "Initial description",
      marker: { kind: "emoji", value: "🧪" },
      auto_delete_policy: "never",
    },
    expectedStatus: 201,
  });
  const eventID = created.body.id;
  await Promise.all([
    request(`/events/${eventID}`, {
      method: "PATCH",
      token: nameSessionOne.token,
      body: { title: "Concurrent title" },
      expectedStatus: 200,
    }),
    request(`/events/${eventID}`, {
      method: "PATCH",
      token: nameSessionOne.token,
      body: { description: "Concurrent description" },
      expectedStatus: 200,
    }),
  ]);
  const concurrentResult = await request(`/events/${eventID}`, {
    expectedStatus: 200,
  });
  assert(
    concurrentResult.body.title === "Concurrent title",
    "concurrent title PATCH was lost",
  );
  assert(
    concurrentResult.body.description === "Concurrent description",
    "concurrent description PATCH was lost",
  );
  await request(`/events/${eventID}`, {
    method: "PATCH",
    token: nameSessionOne.token,
    body: { description: null, marker: null },
    expectedStatus: 200,
  });
  const cleared = await request(`/events/${eventID}`, {
    expectedStatus: 200,
  });
  assert(cleared.body.description === null, "description was not cleared");
  assert(cleared.body.marker === null, "marker was not cleared");
  assert(
    cleared.body.title === "Concurrent title",
    "nullable PATCH overwrote an omitted field",
  );
  await request(`/events/${eventID}`, {
    method: "DELETE",
    token: nameSessionOne.token,
    expectedStatus: 204,
  });

  for (const [userID, account] of cleanupAccounts) {
    await cleanupAccount(userID, account);
    cleanupAccounts.delete(userID);
  }

  let limited = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await request("/auth/login", {
      method: "POST",
      body: { email: "missing@gmail.com", password: "wrong12" },
      headers: {
        "X-Forwarded-For": `198.51.100.${attempt + 1}`,
        "X-Real-IP": `198.51.100.${attempt + 1}`,
      },
      acceptedStatuses: [401, 429],
    });
    if (result.status === 429) {
      limited = true;
      break;
    }
  }
  assert(limited, "rate limiter did not reach 429");
  await request("/auth/login", {
    method: "POST",
    body: { email: "missing@gmail.com", password: "wrong12" },
    headers: {
      "X-Forwarded-For": "203.0.113.250",
      "X-Real-IP": "203.0.113.250",
    },
    expectedStatus: 429,
  });

  console.log(
    "HTTP regression passed: session revoke, permissions, concurrent PATCH, nullable PATCH, and spoof-resistant rate limit",
  );
} finally {
  for (const [userID, account] of cleanupAccounts) {
    try {
      await cleanupAccount(userID, account);
    } catch {
      // The CI/local verification reports the original failure; cleanup is
      // best-effort and never prints credentials or tokens.
    }
  }
}

async function cleanupAccount(userID, account) {
  let result = await request(`/users/${userID}`, {
    method: "DELETE",
    token: account.token,
    acceptedStatuses: [204, 401, 404],
  });
  if (result.status !== 401) return;

  const authentication = await login(account.email, account.password);
  result = await request(`/users/${userID}`, {
    method: "DELETE",
    token: authentication.token,
    acceptedStatuses: [204, 404],
  });
  assert(
    result.status === 204 || result.status === 404,
    "account cleanup failed",
  );
}

async function register(email, password) {
  const result = await request("/auth/register", {
    method: "POST",
    body: { name: "Remediation user", email, password },
    expectedStatus: 201,
  });
  return authentication(result);
}

async function login(email, password) {
  const result = await request("/auth/login", {
    method: "POST",
    body: { email, password },
    expectedStatus: 200,
  });
  return authentication(result);
}

function authentication(result) {
  const setCookie = result.headers.get("set-cookie");
  assert(setCookie, "authentication response did not set refresh cookie");
  return {
    token: result.body.token,
    user: result.body.user,
    cookie: setCookie.split(";", 1)[0],
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${baseURL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token
        ? { Authorization: `Bearer ${options.token}` }
        : {}),
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const expectedStatuses = options.acceptedStatuses ??
    [options.expectedStatus ?? 200];
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `${options.method ?? "GET"} ${path} returned ${response.status}, expected ${expectedStatuses.join("/")}`,
    );
  }

  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: text ? JSON.parse(text) : undefined,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}
