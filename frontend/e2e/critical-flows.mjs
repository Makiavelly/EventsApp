import { spawn } from "node:child_process";
import { request as httpRequest } from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const port = 4178;
const baseURL = `http://127.0.0.1:${port}`;
const frontendRoot = fileURLToPath(new URL("..", import.meta.url));
const vite = spawn(
  process.platform === "win32"
    ? "node_modules\\.bin\\vite.cmd"
    : "./node_modules/.bin/vite",
  ["--host", "127.0.0.1", "--port", String(port)],
  {
    cwd: frontendRoot,
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let viteLog = "";
vite.stdout.on("data", (chunk) => {
  viteLog += chunk.toString();
});
vite.stderr.on("data", (chunk) => {
  viteLog += chunk.toString();
});

try {
  await waitForServer(baseURL);
  const browser = await chromium.launch({ headless: true });
  try {
    await testEventAndProfileFlows(browser);
    console.log("event/profile browser flow passed");
    await testAuthRecoveryAndRouteGuard(browser);
    console.log("auth/route-guard browser flow passed");
    await testMapCardKeyboard(browser);
    console.log("map-card keyboard browser flow passed");
  } finally {
    await browser.close();
  }
} catch (error) {
  console.error(viteLog);
  throw error;
} finally {
  vite.kill("SIGTERM");
}

async function testEventAndProfileFlows(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    geolocation: { latitude: 55.75, longitude: 37.61 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  page.setDefaultTimeout(7_000);
  const dateMeeting = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString();
  let user = { id: 1, name: "Alex", email: "alex@gmail.com" };
  let event = {
    id: 1,
    creator_user_id: 1,
    title: "Existing event",
    description: "Existing description",
    location: { latitude: 55.75, longitude: 37.61 },
    marker: { kind: "emoji", value: "🎉" },
    marker_size: "large",
    date_meeting: dateMeeting,
    auto_delete_policy: "after_interval",
    auto_delete_after_seconds: 7200,
  };
  let participants = [
    { event_id: 1, participant_id: 1, name: "Alex" },
  ];
  const eventCreates = [];
  const eventPatches = [];
  let publicUserRequests = 0;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.endsWith("/auth/refresh") && method === "POST") {
      return json(route, { token: "access", user });
    }
    if (path.endsWith("/auth/logout") && method === "POST") {
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith("/events/1") && method === "GET") {
      return json(route, event);
    }
    if (path.endsWith("/events/1") && method === "PATCH") {
      const patch = request.postDataJSON();
      eventPatches.push(patch);
      event = { ...event, ...patch };
      return json(route, event);
    }
    if (path.endsWith("/events") && method === "POST") {
      const payload = request.postDataJSON();
      eventCreates.push(payload);
      return json(route, {
        ...event,
        ...payload,
        id: 2,
        description: payload.description ?? null,
        location: payload.location ?? null,
        marker: payload.marker ?? null,
        marker_size: "normal",
        date_meeting: payload.date_meeting ?? null,
        auto_delete_after_seconds:
          payload.auto_delete_after_seconds ?? null,
      });
    }
    if (path.endsWith("/events") && method === "GET") {
      return json(route, [event]);
    }
    if (path.endsWith("/participants") && method === "GET") {
      return json(route, participants);
    }
    if (path.endsWith("/users/1") && method === "GET") {
      publicUserRequests += 1;
      return json(route, { id: user.id, name: user.name });
    }
    if (path.endsWith("/users/1") && method === "PATCH") {
      const patch = request.postDataJSON();
      if (patch.name) {
        user = { ...user, name: patch.name };
        participants = participants.map((participant) => ({
          ...participant,
          name: patch.name,
        }));
      }
      return json(route, user);
    }

    return json(route, { error: "Not Found", message: path }, 404);
  });
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );

  await page.goto(`${baseURL}/create`);
  await page
    .getByRole("navigation", { name: "Шаги формы" })
    .waitFor();
  await expectCount(
    page.getByRole("navigation", { name: "Шаги формы" })
      .getByRole("button"),
    4,
    "create wizard steps",
  );
  await page.getByLabel("Название").fill("Created through wizard");
  const localDate = new Date(
    new Date(dateMeeting).getTime() -
      new Date(dateMeeting).getTimezoneOffset() * 60_000,
  ).toISOString().slice(0, 16);
  await page.getByLabel("Дата и время").fill(localDate);
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByRole("button", { name: "Моё место" }).click();
  await page.getByText("55.75000, 37.61000").waitFor();
  await page.getByRole("button", { name: "Не указывать" }).click();
  await page
    .getByText("Координаты не будут сохранены")
    .waitFor();
  await page
    .getByRole("button", { name: "Продолжить без места" })
    .click();
  await page.getByText("Через время", { exact: true }).click();
  await page.getByLabel("Интервал").fill("2");
  await page.getByRole("button", { name: "Создать" }).click();
  await page.waitForURL("**/events/2");

  assert(eventCreates.length === 1, "create emitted exactly one POST");
  assert(
    !("location" in eventCreates[0]),
    "cleared create location is omitted",
  );
  assert(
    eventCreates[0].auto_delete_policy === "after_interval" &&
      eventCreates[0].auto_delete_after_seconds === 7200,
    "create lifecycle is submitted",
  );
  assert(
    !("marker_size" in eventCreates[0]),
    "server-owned marker_size is absent from create",
  );

  await page.goto(`${baseURL}/events/1/edit`);
  await page
    .getByRole("navigation", { name: "Шаги формы" })
    .waitFor();
  const editSteps = page
    .getByRole("navigation", { name: "Шаги формы" })
    .getByRole("button");
  await expectCount(editSteps, 2, "edit wizard steps");
  await assertHidden(page.getByText("Место", { exact: true }));
  await assertHidden(page.getByText("Удаление", { exact: true }));
  await assertValue(page.getByLabel("Название"), "Existing event");
  await assertValue(page.getByLabel("Описание"), "Existing description");

  await page.getByLabel("Описание").fill("Draft survives navigation");
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByRole("button", { name: "Назад" }).click();
  await assertValue(
    page.getByLabel("Описание"),
    "Draft survives navigation",
  );

  await page.getByLabel("Описание").fill("");
  await page.getByLabel("Дата и время").fill("");
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByRole("radio", { name: "Без выбора" }).click();
  await page.getByRole("button", { name: "Сохранить" }).click();
  await page.waitForURL("**/events/1");

  assert(eventPatches.length === 1, "edit emitted exactly one PATCH");
  const patch = eventPatches[0];
  assert(patch.description === null, "description clearing sends null");
  assert(patch.marker === null, "marker clearing sends null");
  assert(patch.date_meeting === null, "date clearing sends null");
  for (const forbiddenField of [
    "location",
    "auto_delete_policy",
    "auto_delete_after_seconds",
    "marker_size",
  ]) {
    assert(
      !(forbiddenField in patch),
      `${forbiddenField} is absent from edit PATCH`,
    );
  }
  assert(
    event.location.latitude === 55.75 &&
      event.auto_delete_policy === "after_interval",
    "location and lifecycle remain unchanged",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL}/create`);
  await page
    .getByRole("navigation", { name: "Шаги формы" })
    .waitFor();
  await expectCount(
    page
      .getByRole("navigation", { name: "Шаги формы" })
      .getByRole("button"),
    4,
    "mobile create wizard steps",
  );
  await page.goto(`${baseURL}/events/1/edit`);
  await page
    .getByRole("navigation", { name: "Шаги формы" })
    .waitFor();
  await expectCount(
    page
      .getByRole("navigation", { name: "Шаги формы" })
      .getByRole("button"),
    2,
    "mobile edit wizard steps",
  );
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto(`${baseURL}/events/1`);
  await page.getByText("Alex", { exact: true }).first().waitFor();
  const requestsBeforeRename = publicUserRequests;
  await page.goto(`${baseURL}/profile`);
  await page.getByRole("button", { name: "Настройки" }).click();
  await page.getByLabel("Имя").fill("Maria");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await page.getByRole("heading", { name: "Maria" }).waitFor();
  await page.goto(`${baseURL}/events/1`);
  await page.getByText("Maria", { exact: true }).first().waitFor();
  assert(
    publicUserRequests > requestsBeforeRename,
    "invalidated public user query refetched backend",
  );
  await page.getByText("Maria", { exact: true }).nth(1).waitFor();

  await page.goto(`${baseURL}/profile`);
  await page.getByRole("button", { name: "Настройки" }).click();
  await page.getByLabel("Новый пароль").fill("new-secret");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await page.waitForURL("**/auth");
  await page
    .getByText("Пароль изменён. Войдите снова с новым паролем.")
    .waitFor();

  await context.close();
}

async function testAuthRecoveryAndRouteGuard(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(7_000);
  let loginCalls = 0;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/auth/refresh")) {
      return json(
        route,
        { error: "Unauthorized", message: "authentication required" },
        401,
      );
    }
    if (path.endsWith("/auth/login")) {
      loginCalls += 1;
      if (loginCalls === 1) {
        return route.abort("failed");
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
      return json(route, {
        token: "access",
        user: { id: 1, name: "Alex", email: "alex@gmail.com" },
      });
    }
    return json(route, []);
  });

  await page.goto(`${baseURL}/create`);
  await page.waitForURL("**/auth");
  await page.getByLabel("Email").fill("alex@gmail.com");
  await page.getByLabel("Пароль").fill("secret12");
  await page.getByRole("button", { name: "Войти" }).click();
  await page.getByText("Failed to fetch").waitFor();
  await assertValue(page.getByLabel("Email"), "alex@gmail.com");
  await assertValue(page.getByLabel("Пароль"), "secret12");

  await page.getByRole("button", { name: "Войти" }).dblclick();
  await page.waitForURL("**/create");
  assert(loginCalls === 2, "double submit emitted one retry request");

  await context.close();
}

async function testMapCardKeyboard(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(7_000);
  await page.route("**/api/v1/participants**", (route) =>
    json(route, []),
  );
  await page.goto(`${baseURL}/e2e/map-carousel.html`);

  const cards = page.getByRole("group", { name: /Карточки событий/ });
  await cards.waitFor();
  await assertAttribute(
    cards,
    "aria-label",
    "Карточки событий, выбрана 1 из 2",
  );
  await cards.press("ArrowDown");
  await assertAttribute(
    cards,
    "aria-label",
    "Карточки событий, выбрана 2 из 2",
  );
  await cards.press("ArrowUp");
  await assertAttribute(
    cards,
    "aria-label",
    "Карточки событий, выбрана 1 из 2",
  );
  await cards.press("Escape");
  await page.getByText("closed", { exact: true }).waitFor({
    timeout: 2_000,
  });

  await context.close();
}

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function expectCount(locator, count, label) {
  const actual = await locator.count();
  assert(actual === count, `${label}: got ${actual}, want ${count}`);
}

async function assertValue(locator, expected) {
  await locator.waitFor();
  const actual = await locator.inputValue();
  assert(actual === expected, `value ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
}

async function assertAttribute(locator, name, expected) {
  await locator.waitFor();
  const actual = await locator.getAttribute(name);
  assert(actual === expected, `${name} ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
}

async function assertHidden(locator) {
  assert(await locator.count() === 0, "unexpected element is visible");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const status = await requestStatus(url);
      if (status >= 200 && status < 500) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Vite did not start at ${url}`);
}

function requestStatus(url) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    });
    request.on("error", reject);
    request.end();
  });
}
