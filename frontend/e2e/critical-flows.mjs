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
    await testMapCardCarousel(browser);
    console.log("map-card carousel browser flow passed");
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
  const fartherEvent = {
    ...event,
    id: 3,
    creator_user_id: 2,
    title: "Farther event",
    description: "Farther description",
    location: { latitude: 55.89, longitude: 37.75 },
  };
  const sameLocationEvent = {
    ...event,
    id: 4,
    creator_user_id: 2,
    title: "Same place event",
    description: "Same place description",
    marker: { kind: "color", value: "#d97757" },
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
      return json(route, [fartherEvent, event, sameLocationEvent]);
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

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL}/discover`);
  const topNavigation = page.getByRole("navigation", { name: "Основная навигация" });
  await topNavigation.waitFor();
  await assertAttribute(topNavigation, "data-placement", "inline");
  await expectCount(topNavigation, 1, "discover has one navigation");
  await expectCount(page.getByRole("button", { name: "Карта" }), 0, "map/list control is removed");
  await expectCount(page.getByRole("button", { name: "Список" }), 0, "list control is removed");

  const discoverCarousel = page.getByTestId("discover-event-carousel");
  const discoverViewport = page.getByTestId("discover-event-carousel-viewport");
  await discoverCarousel.waitFor();
  const collapsedFrame = await discoverCarousel.evaluate((element) => {
    const frame = element.getBoundingClientRect();
    return { height: frame.height, bottom: frame.bottom };
  });
  const collapsedHeight = collapsedFrame.height;
  assert(Math.abs(collapsedHeight - 84) <= 1, `discover carousel collapsed height is ${collapsedHeight}`);
  assert(Math.abs(collapsedFrame.bottom - 844) <= 1, `discover carousel ends at ${collapsedFrame.bottom} instead of the screen edge`);
  const discoverTitles = await page.locator("[data-discover-event-card-id]").evaluateAll((cards) =>
    cards.map((card) => ({
      id: card.getAttribute("data-discover-event-card-id"),
      opacity: Number(getComputedStyle(card).opacity),
    })),
  );
  assert(discoverTitles[0]?.id === "1", "nearest event is the first carousel card");
  assert(discoverTitles[1]?.opacity === 0, "only the first event is visible while collapsed");

  const nearestButton = page.getByRole("button", { name: "Existing event" });
  const nearestBox = await nearestButton.boundingBox();
  assert(nearestBox, "nearest event card has a bounding box");
  await page.mouse.move(nearestBox.x + nearestBox.width / 2, nearestBox.y + nearestBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(nearestBox.x + nearestBox.width / 2, nearestBox.y - 220, { steps: 8 });
  const draggedHeight = await discoverCarousel.evaluate((element) => element.getBoundingClientRect().height);
  assert(draggedHeight > collapsedHeight + 150, "carousel follows the upward drag");
  await page.mouse.up();
  await assertAttribute(discoverCarousel, "data-open", "true");
  const openBackdrop = await page.getByTestId("discover-carousel-backdrop").evaluate((element) => {
    const style = getComputedStyle(element);
    return { backdropFilter: style.backdropFilter, maskImage: style.maskImage };
  });
  assert(openBackdrop.backdropFilter !== "none", "map background is blurred while carousel is open");
  assert(openBackdrop.maskImage.includes("gradient"), "blur does not leave a smoothly revealed marker area");

  await page.mouse.click(380, 350);
  await page.waitForFunction(() => {
    const carousel = document.querySelector("[data-testid='discover-event-carousel'][data-variant='all-events']");
    return carousel?.getAttribute("data-open") === "false"
      && Math.abs(carousel.getBoundingClientRect().height - 84) <= 1;
  });
  await page.waitForTimeout(100);
  const reopenedNearestBox = await nearestButton.boundingBox();
  assert(reopenedNearestBox, "nearest event card remains available after the first outside click");
  await page.mouse.move(reopenedNearestBox.x + reopenedNearestBox.width / 2, reopenedNearestBox.y + reopenedNearestBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(reopenedNearestBox.x + reopenedNearestBox.width / 2, reopenedNearestBox.y - 220, { steps: 8 });
  await page.mouse.up();
  await assertAttribute(discoverCarousel, "data-open", "true");

  const fartherButton = page.getByRole("button", { name: "Farther event" });
  await page.waitForFunction(() => {
    const lastCard = document.querySelector("[data-discover-event-card-id='3']");
    const carousel = document.querySelector("[data-testid='discover-event-carousel']");
    if (!(lastCard instanceof HTMLElement) || !(carousel instanceof HTMLElement)) return false;
    return Math.abs(lastCard.getBoundingClientRect().bottom - carousel.getBoundingClientRect().bottom) <= 1;
  });
  const initialTailMaximum = await discoverViewport.evaluate((element) => element.scrollHeight - element.clientHeight);
  const fartherBox = await fartherButton.boundingBox();
  assert(fartherBox, "last event card has a bounding box");
  await page.mouse.move(fartherBox.x + fartherBox.width / 2, fartherBox.y + fartherBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(fartherBox.x + fartherBox.width / 2, fartherBox.y - 500, { steps: 12 });
  const pulledTailScrollTop = await discoverViewport.evaluate((element) => element.scrollTop);
  assert(
    pulledTailScrollTop > initialTailMaximum + 300,
    "all-events carousel tail stopped at the last card",
  );
  await page.waitForTimeout(250);
  const heldTailScrollTop = await discoverViewport.evaluate((element) => element.scrollTop);
  assert(heldTailScrollTop >= pulledTailScrollTop - 1, "all-events carousel settled before pointer release");
  await page.mouse.up();
  await page.waitForFunction(() => {
    const lastCard = document.querySelector("[data-discover-event-card-id='3']");
    const carousel = document.querySelector("[data-testid='discover-event-carousel']");
    if (!(lastCard instanceof HTMLElement) || !(carousel instanceof HTMLElement)) return false;
    return Math.abs(lastCard.getBoundingClientRect().bottom - carousel.getBoundingClientRect().bottom) <= 1;
  });
  await page.waitForFunction(() => {
    const viewport = document.querySelector("[data-testid='discover-event-carousel-viewport']");
    return viewport instanceof HTMLElement && viewport.scrollHeight - viewport.clientHeight <= 1;
  });

  await nearestButton.click();
  await assertAttribute(nearestButton, "aria-expanded", "true");
  assert(await page.getByText("Описание не указано.", { exact: true }).isVisible(), "persistent carousel opens event details");

  await page.waitForFunction(() => {
    const map = document.querySelector(".base-map");
    return map instanceof HTMLElement && map.dataset.focusedMarkerX && map.dataset.focusedMarkerY;
  });
  const groupedMarkerPoint = await page.locator(".base-map").evaluate((element) => {
    const frame = element.getBoundingClientRect();
    return {
      x: frame.left + Number(element.dataset.focusedMarkerX),
      y: frame.top + Number(element.dataset.focusedMarkerY),
    };
  });
  await page.mouse.click(380, 350);
  await page.waitForFunction(() => {
    const carousel = document.querySelector("[data-testid='discover-event-carousel'][data-variant='all-events']");
    const viewport = document.querySelector("[data-testid='discover-event-carousel-viewport']");
    return carousel?.getAttribute("data-open") === "false"
      && Math.abs(carousel.getBoundingClientRect().height - 84) <= 1
      && viewport instanceof HTMLElement
      && viewport.scrollTop <= 1;
  });
  await assertAttribute(nearestButton, "aria-expanded", "false");

  await page.waitForTimeout(350);
  await page.mouse.click(groupedMarkerPoint.x, groupedMarkerPoint.y);
  const selectionCarousel = page.locator("[data-testid='discover-event-carousel'][data-variant='selection']");
  await selectionCarousel.waitFor();
  await assertAttribute(selectionCarousel, "aria-label", "Карусель выбранных событий, 2");
  await assertAttribute(selectionCarousel, "data-open", "true");

  const selectedEventButton = page.getByRole("button", { name: "Existing event" });
  await selectedEventButton.click();
  await assertAttribute(selectedEventButton, "aria-expanded", "true");
  await page.waitForFunction(() =>
    document.querySelector(".event-map")?.getAttribute("data-focused-event-id") === "1"
  );

  await page.mouse.click(380, 350);
  await selectionCarousel.waitFor({ state: "detached" });
  const restoredAllEventsCarousel = page.locator("[data-testid='discover-event-carousel'][data-variant='all-events']");
  await restoredAllEventsCarousel.waitFor();
  const restoredAllEventsHeight = await restoredAllEventsCarousel.evaluate((element) => element.getBoundingClientRect().height);
  assert(Math.abs(restoredAllEventsHeight - 84) <= 1, "all-events carousel did not return collapsed after marker selection");

  const restoredNearestButton = page.getByRole("button", { name: "Existing event" });
  const restoredNearestBox = await restoredNearestButton.boundingBox();
  assert(restoredNearestBox, "restored nearest event card has a bounding box");
  await page.mouse.move(restoredNearestBox.x + restoredNearestBox.width / 2, restoredNearestBox.y + restoredNearestBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(restoredNearestBox.x + restoredNearestBox.width / 2, restoredNearestBox.y - 220, { steps: 8 });
  await page.mouse.up();
  await assertAttribute(restoredAllEventsCarousel, "data-open", "true");
  const restoredFartherButton = page.getByRole("button", { name: "Farther event" });
  await restoredFartherButton.click();
  await page.waitForFunction(() =>
    document.querySelector(".event-map")?.getAttribute("data-focused-event-id") === "3"
  );
  await page.waitForFunction(() => {
    const map = document.querySelector(".base-map");
    return map instanceof HTMLElement && map.dataset.focusedMarkerX && map.dataset.focusedMarkerY;
  });
  const singleMarkerPoint = await page.locator(".base-map").evaluate((element) => {
    const frame = element.getBoundingClientRect();
    return {
      x: frame.left + Number(element.dataset.focusedMarkerX),
      y: frame.top + Number(element.dataset.focusedMarkerY),
    };
  });
  await page.mouse.click(380, 350);
  await page.waitForFunction(() => {
    const carousel = document.querySelector("[data-testid='discover-event-carousel'][data-variant='all-events']");
    return carousel?.getAttribute("data-open") === "false";
  });
  await page.waitForTimeout(350);
  await page.mouse.click(singleMarkerPoint.x, singleMarkerPoint.y);
  const singleSelectionCarousel = page.locator("[data-testid='discover-event-carousel'][data-variant='selection']");
  await singleSelectionCarousel.waitFor();
  await assertAttribute(singleSelectionCarousel, "aria-label", "Карусель выбранных событий, 1");
  await assertAttribute(singleSelectionCarousel, "data-open", "true");
  await page.mouse.click(380, 350);
  await singleSelectionCarousel.waitFor({ state: "detached" });

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

async function testMapCardCarousel(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(7_000);
  await page.goto(`${baseURL}/e2e/map-carousel.html`);

  const cards = page.getByRole("group", { name: /Карусель/ });
  const viewport = page.getByTestId("event-card-carousel-viewport");
  await cards.waitFor();
  await assertAttribute(
    cards,
    "aria-label",
    "Карусель из 7 карточек событий",
  );
  const carouselHeight = await cards.evaluate((element) => element.getBoundingClientRect().height);
  assert(carouselHeight <= 844 * 0.5 + 1, `carousel height ${carouselHeight} exceeds half the viewport`);
  await expectCount(cards.locator("[aria-current]"), 0, "carousel has no active card");
  const carouselFrame = await cards.evaluate((element) => {
    const style = getComputedStyle(element);
    const decoration = getComputedStyle(element, "::before");
    return {
      borderWidth: style.borderWidth,
      outlineWidth: style.outlineWidth,
      decorationContent: decoration.content,
    };
  });
  assert(carouselFrame.borderWidth === "0px", `carousel border is ${carouselFrame.borderWidth}`);
  assert(carouselFrame.outlineWidth === "0px", `carousel outline is ${carouselFrame.outlineWidth}`);
  assert(carouselFrame.decorationContent === "none", "carousel still has a framing decoration");

  const firstCardElement = page.locator("[data-event-card-id='1']");
  const secondCardElement = page.locator("[data-event-card-id='2']");
  const initialFirstBox = await firstCardElement.boundingBox();
  const initialSecondBox = await secondCardElement.boundingBox();
  assert(initialFirstBox && initialSecondBox, "initial carousel cards are visible");
  assert(Math.abs(initialFirstBox.x - 12) <= 1, `widest card starts at ${initialFirstBox.x} instead of the map control inset`);
  assert(Math.abs(initialFirstBox.x + initialFirstBox.width - 378) <= 1, "widest card does not align with the map control width");
  assert(initialSecondBox.y < initialFirstBox.y + initialFirstBox.height, "cards do not overlap vertically");
  assert(Math.abs(initialSecondBox.width - initialFirstBox.width) <= 1, "card widths are not equal");
  assert(Math.abs(initialSecondBox.height - initialFirstBox.height) <= 1, "card heights are not equal");
  const cardAppearance = await page.locator("[data-event-card-id='1'], [data-event-card-id='2']").evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return {
        borderRadius: style.borderRadius,
        borderBottomLeftRadius: style.borderBottomLeftRadius,
        borderBottomRightRadius: style.borderBottomRightRadius,
        backgroundImage: style.backgroundImage,
      };
    }),
  );
  assert(cardAppearance[0].borderRadius === cardAppearance[1].borderRadius, "card corner radii are not equal");
  assert(cardAppearance.every((appearance) =>
    Number.parseFloat(appearance.borderBottomLeftRadius) > 0
    && Number.parseFloat(appearance.borderBottomRightRadius) > 0
  ), "card bottom corners are not rounded");
  const bottomRadius = Number.parseFloat(cardAppearance[0].borderBottomLeftRadius);
  const overlap = initialFirstBox.y + initialFirstBox.height - initialSecondBox.y;
  assert(overlap >= bottomRadius - 1, `card overlap ${overlap}px does not cover the ${bottomRadius}px bottom radius`);
  assert(cardAppearance[0].backgroundImage !== cardAppearance[1].backgroundImage, "card shades are not varied");
  const shadeValues = await page.locator("[data-card-shade]").evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-card-shade")),
  );
  assert(new Set(shadeValues).size >= 3, "carousel does not provide enough shade variation");

  const secondCard = page.getByRole("button", { name: "Second card" });
  await assertAttribute(secondCard, "aria-expanded", "false");
  await secondCard.click();
  await assertAttribute(secondCard, "aria-expanded", "true");
  assert(await page.getByText("Second description", { exact: true }).isVisible(), "expanded description is visible");
  assert(await page.getByText(/2 февр.*2030/).isVisible(), "expanded date is visible");
  await assertAttribute(page.getByRole("button", { name: "First card" }), "aria-expanded", "false");

  const expandedEndScrollTop = await viewport.evaluate((element) => {
    const list = element.querySelector(".event-card-carousel__list");
    const lastCard = list?.lastElementChild;
    if (!(list instanceof HTMLElement) || !(lastCard instanceof HTMLElement)) return 0;
    const endScrollTop = list.offsetTop + lastCard.offsetTop + lastCard.offsetHeight - element.clientHeight;
    element.scrollTop = endScrollTop;
    element.dispatchEvent(new Event("scroll"));
    return element.scrollTop;
  });
  assert(expandedEndScrollTop > 0, "expanded carousel did not reach its last card");
  await secondCard.evaluate((element) => element.click());
  await assertAttribute(secondCard, "aria-expanded", "false");
  await page.waitForFunction(() => {
    const viewport = document.querySelector("[data-testid='event-card-carousel-viewport']");
    const list = viewport?.querySelector(".event-card-carousel__list");
    const lastCard = list?.lastElementChild;
    if (!(viewport instanceof HTMLElement) || !(lastCard instanceof HTMLElement)) return false;
    return Math.abs(lastCard.getBoundingClientRect().bottom - viewport.getBoundingClientRect().bottom) <= 1;
  });

  const firstCard = page.getByRole("button", { name: "First card" });
  await firstCard.focus();
  await page.keyboard.press("ArrowDown");
  assert(await secondCard.evaluate((element) => element === document.activeElement), "ArrowDown focuses the next equal card");
  await page.keyboard.press("ArrowDown");
  const thirdCard = page.getByRole("button", { name: "Third card" });
  assert(await thirdCard.evaluate((element) => element === document.activeElement), "second ArrowDown advances the carousel");
  await page.keyboard.press("ArrowUp");
  assert(await secondCard.evaluate((element) => element === document.activeElement), "ArrowUp moves the carousel back");

  await viewport.evaluate((element) => {
    element.scrollTop = 36;
    element.dispatchEvent(new Event("scroll"));
  });
  await page.waitForFunction(() => {
    const firstCard = document.querySelector("[data-event-card-id='1']");
    return firstCard ? Number(getComputedStyle(firstCard).opacity) < 1 : false;
  });
  const firstVisual = await page.locator("[data-event-card-id='1']").evaluate((element) => {
    const style = getComputedStyle(element);
    const card = element.getBoundingClientRect();
    const viewport = element.closest("[data-testid='event-card-carousel-viewport']")?.getBoundingClientRect();
    return {
      opacity: Number(style.opacity),
      transform: style.transform,
      top: card.top,
      viewportTop: viewport?.top ?? 0,
      fullyInsideTopEdge: viewport ? card.top >= viewport.top - 1 : false,
    };
  });
  assert(firstVisual.opacity < 1, `top card opacity ${firstVisual.opacity} did not decrease`);
  assert(firstVisual.transform !== "none", "top card did not shrink while leaving the viewport");
  assert(firstVisual.fullyInsideTopEdge, "top card was clipped instead of shrinking as a whole");
  assert(firstVisual.top > firstVisual.viewportTop, "top card did not start fading before reaching the edge");

  await viewport.evaluate((element) => {
    element.scrollTop = 48;
    element.dispatchEvent(new Event("scroll"));
  });
  await page.waitForFunction((previousTop) => {
    const firstCard = document.querySelector("[data-event-card-id='1']");
    return firstCard ? firstCard.getBoundingClientRect().top < previousTop : false;
  }, firstVisual.top);

  await page.keyboard.press("Escape");
  await page.getByText("closed", { exact: true }).waitFor({
    timeout: 2_000,
  });

  const fewPage = await context.newPage();
  await fewPage.goto(`${baseURL}/e2e/map-carousel.html?few=1`);
  const fewCards = fewPage.getByRole("group", { name: /Карусель/ });
  const fewViewport = fewPage.getByTestId("event-card-carousel-viewport");
  await fewCards.waitFor();
  const initialFewAlignment = await fewPage.locator("[data-event-card-id='2']").evaluate((element) => {
    const card = element.getBoundingClientRect();
    const viewport = element.closest("[data-testid='event-card-carousel-viewport']")?.getBoundingClientRect();
    return viewport ? Math.abs(card.bottom - viewport.bottom) : Number.POSITIVE_INFINITY;
  });
  assert(initialFewAlignment <= 1, `short carousel ends ${initialFewAlignment}px above its bottom edge`);

  const pullState = await fewViewport.evaluate((element) => {
    element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    const initialMaximum = element.scrollHeight - element.clientHeight;
    for (let index = 0; index < 6; index += 1) {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event("scroll"));
    }
    return {
      initialMaximum,
      viewportHeight: element.clientHeight,
      scrollTop: element.scrollTop,
    };
  });
  assert(
    pullState.scrollTop > pullState.initialMaximum + pullState.viewportHeight * 3,
    "carousel tail stopped growing during a continued pull",
  );
  await fewPage.waitForTimeout(250);
  const heldScrollTop = await fewViewport.evaluate((element) => element.scrollTop);
  assert(heldScrollTop >= pullState.scrollTop - 1, "carousel snapped back before the user released the gesture");
  await fewViewport.evaluate((element) => {
    element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  });
  await fewPage.waitForFunction(() => {
    const viewport = document.querySelector("[data-testid='event-card-carousel-viewport']");
    return viewport ? viewport.scrollTop < 1 : false;
  });
  const settledFewAlignment = await fewPage.locator("[data-event-card-id='2']").evaluate((element) => {
    const card = element.getBoundingClientRect();
    const viewport = element.closest("[data-testid='event-card-carousel-viewport']")?.getBoundingClientRect();
    return viewport ? Math.abs(card.bottom - viewport.bottom) : Number.POSITIVE_INFINITY;
  });
  assert(settledFewAlignment <= 1, "short carousel did not restore the last card to its bottom edge");
  const resetMaximum = await fewViewport.evaluate((element) => element.scrollHeight - element.clientHeight);
  assert(resetMaximum <= 97, `dynamic carousel tail did not reset: ${resetMaximum}px`);
  await fewPage.close();

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
