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
  const discoverNavigation = page.getByRole("navigation", { name: "Основная навигация" });
  await discoverNavigation.waitFor();
  await assertAttribute(discoverNavigation, "data-placement", "inline");
  await expectCount(discoverNavigation, 1, "discover has one navigation");
  await expectCount(page.getByRole("button", { name: "Карта" }), 0, "map/list control is removed");
  await expectCount(page.getByRole("button", { name: "Список" }), 0, "list control is removed");

  const liquidPanel = page.getByTestId("liquid-event-panel");
  const discoverHandle = page.getByRole("button", { name: "Открыть карусель событий" });
  const handleControl = page.locator("[data-liquid-panel-handle]");
  await liquidPanel.waitFor();
  await discoverHandle.waitFor();
  await assertAttribute(liquidPanel, "data-state", "closed");
  await assertAttribute(discoverHandle, "aria-expanded", "false");
  const closedPath = await liquidPanel.locator(".liquid-event-panel__surface path").getAttribute("d");
  const closedSurfaceStyles = await liquidPanel.evaluate((element) => {
    const alpha = (color) => {
      if (!color.startsWith("rgba")) return 1;
      const match = color.match(/,\s*([\d.]+)\)$/);
      return match ? Number(match[1]) : 1;
    };
    const panelPath = element.querySelector(".liquid-event-panel__surface path");
    const panelStop = element.querySelector("[data-liquid-surface-stop='panel']");
    const menuStop = element.querySelector("[data-liquid-surface-stop='menu']");
    const handle = element.querySelector(".liquid-event-panel__grip");
    const navigation = element.querySelector(".animated-selector--navigation");
    const frame = element.querySelector(".liquid-event-panel__frame");
    if (!(panelPath instanceof SVGPathElement)
      || !(panelStop instanceof SVGStopElement)
      || !(menuStop instanceof SVGStopElement)
      || !(handle instanceof HTMLElement)
      || !(navigation instanceof HTMLElement)
      || !(frame instanceof HTMLElement)) return null;
    const pathBox = panelPath.getBBox();
    const frameBox = frame.getBoundingClientRect();
    return {
      handleAlpha: alpha(getComputedStyle(handle).backgroundColor),
      handleRotation: getComputedStyle(element).getPropertyValue("--liquid-handle-rotation").trim(),
      menuAlpha: Number(getComputedStyle(menuStop).getPropertyValue("stop-opacity")),
      navigationAlpha: alpha(getComputedStyle(navigation).backgroundColor),
      panelAlpha: Number(getComputedStyle(panelStop).getPropertyValue("stop-opacity")),
      navigationBorderColor: getComputedStyle(navigation).borderColor,
      navigationBottom: navigation.getBoundingClientRect().bottom - frameBox.top,
      navigationBoxShadow: getComputedStyle(navigation).boxShadow,
      surfaceBottom: pathBox.y + pathBox.height,
    };
  });
  assert(closedSurfaceStyles, "closed liquid surface styles are available");
  assert(
    closedSurfaceStyles.navigationAlpha === 0,
    "menu bar draws a second surface over the shared liquid frame",
  );
  assert(
    closedSurfaceStyles.handleAlpha === 0,
    "closed handle still draws a separate surface over the liquid tab",
  );
  assert(closedSurfaceStyles.handleRotation === "0deg", "closed handle arrow is rotated");
  assert(closedSurfaceStyles.menuAlpha === 1, "closed menu bar is translucent");
  assert(
    closedSurfaceStyles.navigationBorderColor.endsWith(", 0)"),
    "menu bar draws a second border over the shared liquid frame",
  );
  assert(
    closedSurfaceStyles.navigationBoxShadow === "none",
    "menu bar casts a shadow onto the shared handle frame",
  );
  assert(
    Math.abs(closedSurfaceStyles.surfaceBottom - closedSurfaceStyles.navigationBottom) < 1,
    "shared liquid surface continues below the menu bar",
  );
  const initialHandleBox = await handleControl.boundingBox();
  assert(initialHandleBox, "discover menu handle has a bounding box");
  await page.mouse.move(initialHandleBox.x + initialHandleBox.width / 2, initialHandleBox.y + initialHandleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(initialHandleBox.x + initialHandleBox.width / 2, initialHandleBox.y - 70, { steps: 10 });
  await assertAttribute(liquidPanel, "data-state", "dragging");
  const dragScrollLock = await page.evaluate(() => ({
    overflow: document.body.style.overflow,
    touchAction: document.body.style.touchAction,
  }));
  assert(dragScrollLock.overflow === "hidden" && dragScrollLock.touchAction === "none", "page scroll is not locked during vertical drag");
  const shortDragPath = await liquidPanel.locator(".liquid-event-panel__surface path").getAttribute("d");
  assert(shortDragPath !== closedPath, "SVG edge does not deform during drag");
  const dragRotation = await liquidPanel.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).getPropertyValue("--liquid-handle-rotation"))
  );
  assert(dragRotation > 0 && dragRotation < 180, "handle arrow does not rotate with drag progress");
  await page.waitForTimeout(100);
  await page.mouse.move(initialHandleBox.x + initialHandleBox.width / 2, initialHandleBox.y - 71);
  await page.mouse.up();
  await page.waitForFunction(() =>
    document.querySelector("[data-testid='liquid-event-panel']")?.getAttribute("data-state") === "closed"
  );
  const releasedScrollLock = await page.evaluate(() => document.body.style.touchAction);
  assert(releasedScrollLock === "", "page scroll lock remains after drag release");

  const reopenedHandleBox = await handleControl.boundingBox();
  assert(reopenedHandleBox, "discover handle remains available after the cancelled drag");
  await page.mouse.move(reopenedHandleBox.x + reopenedHandleBox.width / 2, reopenedHandleBox.y + reopenedHandleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(reopenedHandleBox.x + reopenedHandleBox.width / 2, reopenedHandleBox.y - 300, { steps: 14 });
  const pulledHandleBox = await handleControl.boundingBox();
  assert(pulledHandleBox && pulledHandleBox.y < reopenedHandleBox.y - 150, "panel handle does not follow the pointer upward");
  await page.mouse.up();
  await page.waitForFunction(() =>
    document.querySelector("[data-testid='liquid-event-panel']")?.getAttribute("data-state") === "opened"
  );
  const closeHandle = page.getByRole("button", { name: "Закрыть карусель событий" });
  await assertAttribute(closeHandle, "aria-expanded", "true");
  await expectCount(page.getByText("События рядом"), 0, "liquid panel eyebrow is removed");
  await expectCount(page.getByText("Куда отправимся?"), 0, "liquid panel heading is removed");
  const liquidVisualStyles = await liquidPanel.evaluate((element) => {
    const panelStop = element.querySelector("[data-liquid-surface-stop='panel']");
    const menuStop = element.querySelector("[data-liquid-surface-stop='menu']");
    const navigation = element.querySelector(".animated-selector--navigation");
    if (!(panelStop instanceof SVGStopElement)
      || !(menuStop instanceof SVGStopElement)
      || !(navigation instanceof HTMLElement)) return null;
    const navigationStyle = getComputedStyle(navigation);
    return {
      handleAlpha: (() => {
        const handle = element.querySelector(".liquid-event-panel__grip");
        const color = handle instanceof HTMLElement ? getComputedStyle(handle).backgroundColor : "";
        const match = color.match(/,\s*([\d.]+)\)$/);
        return match ? Number(match[1]) : 1;
      })(),
      handleRotation: getComputedStyle(element).getPropertyValue("--liquid-handle-rotation").trim(),
      menuAlpha: Number(getComputedStyle(menuStop).getPropertyValue("stop-opacity")),
      panelAlpha: Number(getComputedStyle(panelStop).getPropertyValue("stop-opacity")),
      navigationBackground: navigationStyle.backgroundColor,
      navigationBorderRadius: Number.parseFloat(navigationStyle.borderTopLeftRadius),
      navigationBoxShadow: navigationStyle.boxShadow,
      navigationWidth: navigation.getBoundingClientRect().width,
    };
  });
  assert(liquidVisualStyles, "liquid panel and menu bar styles are available");
  assert(
    liquidVisualStyles.panelAlpha < closedSurfaceStyles.panelAlpha - 0.2,
    "liquid surface opacity does not decrease while opening",
  );
  assert(liquidVisualStyles.menuAlpha === 1, "opened menu bar becomes translucent");
  assert(liquidVisualStyles.handleAlpha === 0, "opened handle draws a separate surface");
  assert(liquidVisualStyles.handleRotation === "180deg", "opened handle arrow does not complete a half turn");
  assert(liquidVisualStyles.navigationBackground.endsWith(", 0)"), "menu bar draws a separate background");
  assert(liquidVisualStyles.navigationBorderRadius >= 20, "menu bar is not a rounded rectangle");
  assert(liquidVisualStyles.navigationBoxShadow === "none", "menu bar casts a separate shadow");
  assert(liquidVisualStyles.navigationWidth < 390, "menu bar no longer has the standard page inset");
  const openBackdrop = await page.getByTestId("liquid-event-panel-backdrop").evaluate((element) => {
    const style = getComputedStyle(element);
    return { backdropFilter: style.backdropFilter, maskImage: style.maskImage };
  });
  assert(openBackdrop.backdropFilter !== "none", "map background is blurred while carousel is open");
  assert(openBackdrop.maskImage.includes("gradient"), "blur does not leave a smoothly revealed marker area");
  await page.setViewportSize({ width: 320, height: 700 });
  await page.waitForTimeout(100);
  const narrowOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(narrowOverflow <= 0, `liquid panel causes ${narrowOverflow}px horizontal overflow at 320px`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);

  const carouselViewport = page.getByTestId("liquid-event-carousel-viewport");
  await expectCount(page.locator("[data-liquid-event-id]"), 3, "vertical event carousel cards");
  const carouselBox = await carouselViewport.boundingBox();
  assert(carouselBox, "vertical event carousel has a bounding box");
  const initialCarouselScroll = await carouselViewport.evaluate((element) => element.scrollTop);
  await page.mouse.move(carouselBox.x + carouselBox.width * 0.5, carouselBox.y + carouselBox.height * 0.78);
  await page.mouse.down();
  await page.mouse.move(carouselBox.x + carouselBox.width * 0.5, carouselBox.y + carouselBox.height * 0.12, { steps: 12 });
  const heldCarouselState = await carouselViewport.evaluate((element) => {
    const list = element.querySelector(".liquid-vertical-carousel__list");
    const tail = element.querySelector(".liquid-vertical-carousel__tail");
    const lastCard = list?.lastElementChild;
    if (!(list instanceof HTMLElement) || !(tail instanceof HTMLElement) || !(lastCard instanceof HTMLElement)) return null;
    return {
      naturalEnd: Math.max(
        0,
        list.offsetTop
          + lastCard.offsetTop
          + lastCard.offsetHeight
          - element.clientHeight
          + (Number.parseFloat(getComputedStyle(element).paddingBottom) || 0),
      ),
      scrollTop: element.scrollTop,
      tailHeight: tail.offsetHeight,
    };
  });
  assert(heldCarouselState, "vertical carousel end geometry is available");
  assert(heldCarouselState.scrollTop > initialCarouselScroll + 80, "vertical carousel does not follow an upward pointer drag");
  assert(heldCarouselState.scrollTop > heldCarouselState.naturalEnd, "carousel tail does not extend beyond the last card while held");
  assert(heldCarouselState.tailHeight > 0, "carousel tail is not created during end pull");
  await page.waitForTimeout(250);
  const heldScrollAfterDelay = await carouselViewport.evaluate((element) => element.scrollTop);
  assert(Math.abs(heldScrollAfterDelay - heldCarouselState.scrollTop) < 2, "carousel rewinds before the pointer is released");
  await page.mouse.up();
  await page.waitForFunction(() => {
    const viewport = document.querySelector("[data-testid='liquid-event-carousel-viewport']");
    const list = viewport?.querySelector(".liquid-vertical-carousel__list");
    const tail = viewport?.querySelector(".liquid-vertical-carousel__tail");
    const lastCard = list?.lastElementChild;
    if (!(viewport instanceof HTMLElement)
      || !(list instanceof HTMLElement)
      || !(tail instanceof HTMLElement)
      || !(lastCard instanceof HTMLElement)) return false;
    const naturalEnd = Math.max(
      0,
      list.offsetTop
        + lastCard.offsetTop
        + lastCard.offsetHeight
        - viewport.clientHeight
        + (Number.parseFloat(getComputedStyle(viewport).paddingBottom) || 0),
    );
    return Math.abs(viewport.scrollTop - naturalEnd) < 2 && tail.offsetHeight === 0;
  });
  const settledCarouselScroll = await carouselViewport.evaluate((element) => element.scrollTop);
  await page.waitForTimeout(250);
  const stableCarouselScroll = await carouselViewport.evaluate((element) => element.scrollTop);
  assert(Math.abs(stableCarouselScroll - settledCarouselScroll) < 2, "carousel rewinds after settling on the last event");
  const liquidCardStyles = await page.locator("[data-liquid-event-id]").evaluateAll((cards) => cards.map((card) => {
    const style = getComputedStyle(card);
    return { background: style.backgroundColor, boxShadow: style.boxShadow };
  }));
  assert(new Set(liquidCardStyles.map((style) => style.background)).size === 1, "liquid carousel cards use different colors");
  assert(liquidCardStyles.every((style) => style.boxShadow !== "none"), "liquid carousel cards do not cast shadows");
  const [lastLiquidCardBox, liquidNavigationBox, liquidCarouselBox] = await Promise.all([
    page.locator("[data-liquid-event-id]").last().boundingBox(),
    liquidPanel.locator(".animated-selector--navigation").boundingBox(),
    carouselViewport.boundingBox(),
  ]);
  assert(lastLiquidCardBox && liquidNavigationBox && liquidCarouselBox, "carousel and menu bar geometry is available");
  assert(
    Math.abs(liquidCarouselBox.y + liquidCarouselBox.height - liquidNavigationBox.y) <= 1,
    "carousel does not end at the menu bar top edge",
  );
  assert(
    lastLiquidCardBox.y + lastLiquidCardBox.height <= liquidNavigationBox.y,
    "lower carousel card continues behind the menu bar",
  );
  await assertAttribute(liquidPanel, "data-state", "opened");

  const openedHandleBox = await closeHandle.boundingBox();
  assert(openedHandleBox, "opened panel handle has a bounding box");
  await page.mouse.move(openedHandleBox.x + openedHandleBox.width / 2, openedHandleBox.y + openedHandleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(openedHandleBox.x + openedHandleBox.width / 2, openedHandleBox.y + 400, { steps: 14 });
  await page.mouse.up();
  await page.waitForFunction(() =>
    document.querySelector("[data-testid='liquid-event-panel']")?.getAttribute("data-state") === "closed"
  );

  await discoverHandle.click();
  await page.waitForFunction(() =>
    document.querySelector("[data-testid='liquid-event-panel']")?.getAttribute("data-state") === "opened"
  );
  await page.getByRole("button", { name: "Закрыть карусель событий" }).focus();
  await page.keyboard.press("Space");
  await page.waitForFunction(() =>
    document.querySelector("[data-testid='liquid-event-panel']")?.getAttribute("data-state") === "closed"
  );
  await discoverHandle.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() =>
    document.querySelector("[data-testid='liquid-event-panel']")?.getAttribute("data-state") === "opened"
  );

  await carouselViewport.focus();
  await page.keyboard.press("ArrowUp");
  await page.waitForFunction(() =>
    document.querySelector(".event-map")?.getAttribute("data-focused-event-id") === "1"
  );
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
  await page.mouse.click(385, 350);
  await page.waitForFunction(() =>
    document.querySelector("[data-testid='liquid-event-panel']")?.getAttribute("data-state") === "closed"
  );

  await page.waitForTimeout(250);
  await page.mouse.click(groupedMarkerPoint.x, groupedMarkerPoint.y);
  await page.waitForFunction(() =>
    document.querySelector("[data-testid='liquid-event-panel']")?.getAttribute("data-state") === "opened"
  );
  await assertAttribute(page.getByTestId("liquid-event-carousel"), "aria-label", "Карусель событий, 2");
  await expectCount(page.locator("[data-liquid-event-id]"), 2, "selected vertical carousel cards");
  await page.getByTestId("liquid-event-panel-backdrop").click({ position: { x: 2, y: 120 } });
  await page.waitForFunction(() =>
    document.querySelector("[data-testid='liquid-event-panel']")?.getAttribute("data-state") === "closed"
  );

  await discoverNavigation.getByRole("link", { name: "Профиль" }).click();
  await page.waitForURL("**/profile");
  await expectCount(discoverHandle, 0, "discover handle is absent outside search");

  await page.getByRole("navigation", { name: "Основная навигация" })
    .getByRole("link", { name: "Поиск" })
    .click();
  await page.waitForURL("**/discover");
  const returnedDiscoverHandle = page.getByRole("button", { name: "Открыть карусель событий" });
  await returnedDiscoverHandle.waitFor();
  await assertAttribute(returnedDiscoverHandle, "aria-expanded", "false");

  await page.getByRole("navigation", { name: "Основная навигация" })
    .getByRole("link", { name: "Профиль" })
    .click();
  await page.waitForURL("**/profile");
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
