import { expect, test, type Page } from "@playwright/test";

const apiUrl = "http://127.0.0.1:5000";

const user = {
  id: 7,
  externalId: "usr-supervisor",
  username: "supervisor",
  fullName: "Supervisora Operativa",
  email: "supervisor@example.com",
  company: { id: 2, externalId: "cmp-1", name: "UrbanTrack Demo" },
  roles: ["supervisor"],
  permissions: ["dashboard.read", "visits.read", "sellers.read"],
};

async function mockMobileOperations(page: Page) {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route(`${apiUrl}/api/auth/refresh`, (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );
  await page.route(`${apiUrl}/api/auth/login`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken: "mobile-access-token",
        expiresAtUtc: "2099-01-01T00:00:00Z",
        user,
      }),
    }),
  );
  await page.route(`${apiUrl}/api/companies/current/time-zone`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ timeZoneId: "America/La_Paz" }),
    }),
  );
  await page.route(`${apiUrl}/api/sellers`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          externalId: "seller-1",
          displayName: "María Responsable",
        },
      ]),
    }),
  );
  await page.route(`${apiUrl}/api/dashboard`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        metrics: {},
        projectLocations: [],
        recentActivity: [],
        upcomingFollowUps: [],
        urgentDeliveries: [],
      }),
    }),
  );
  await page.route(`${apiUrl}/api/dashboard/map-items`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route(`${apiUrl}/api/customers/statuses`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route(`${apiUrl}/api/delivery-statuses`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route(`${apiUrl}/api/tracking/active-sellers`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          sellerExternalId: "seller-1",
          sellerName: "María Responsable",
          workdayExternalId: "workday-1",
          status: "open",
          startedAtUtc: "2026-10-11T12:00:00Z",
          lastLocationAtUtc: "2026-10-11T15:00:00Z",
          latitude: -17.3935,
          longitude: -66.157,
        },
      ]),
    }),
  );
  await page.route(new RegExp(`${apiUrl}/api/visits(?:\\?.*)?$`), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          externalId: "visit-1",
          customerExternalId: "customer-1",
          customerName: "Clínica Central",
          visitedAtUtc: "2026-10-11T14:30:00Z",
          checkOutAtUtc: null,
          sellerExternalId: "seller-1",
          sellerName: "María Responsable",
        },
      ]),
    }),
  );
  await page.route(new RegExp(`${apiUrl}/api/workdays(?:\\?.*)?$`), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "workday-1",
          sellerExternalId: "seller-1",
          sellerName: "María Responsable",
          status: "closed",
          startedAtUtc: "2026-10-11T12:00:00Z",
          endedAtUtc: "2026-10-11T20:00:00Z",
          visitCount: 1,
          locationCount: 2,
        },
      ]),
    }),
  );
  await page.route(`${apiUrl}/api/workdays/workday-1`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "workday-1",
        sellerExternalId: "seller-1",
        sellerName: "María Responsable",
        status: "closed",
        startedAtUtc: "2026-10-11T12:00:00Z",
        endedAtUtc: "2026-10-11T20:00:00Z",
        visitCount: 1,
        locationCount: 2,
        visits: [],
      }),
    }),
  );
  await page.route(
    new RegExp(`${apiUrl}/api/seller-routes(?:\\?.*)?$`),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          routePoints: [
            {
              externalId: "point-1",
              capturedAtUtc: "2026-10-11T12:00:00Z",
              latitude: -17.3935,
              longitude: -66.157,
            },
            {
              externalId: "point-2",
              capturedAtUtc: "2026-10-11T20:00:00Z",
              latitude: -17.401,
              longitude: -66.149,
            },
          ],
          segments: [
            {
              type: "LineString",
              coordinates: [
                [-66.157, -17.3935],
                [-66.149, -17.401],
              ],
            },
          ],
          mapMatched: true,
        }),
      }),
  );
}

async function login(page: Page) {
  await page.goto("/login");
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill("secret-password");
  await page.getByRole("button", { name: /Iniciar sesi/ }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("el monitoreo mantiene el mapa contenido y debajo del menú móvil", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockMobileOperations(page);
  await login(page);
  await page.getByRole("button", { name: "Abrir navegación" }).click();
  await page.getByRole("button", { name: "Monitoreo en vivo" }).click();
  await page.getByRole("link", { name: "Estado del equipo" }).click();

  await expect(
    page.getByRole("heading", { name: "Estado del equipo" }),
  ).toBeVisible();
  const map = page.locator(".operations-live-map .leaflet-container");
  await expect(map).toBeVisible();

  const layout = await page.evaluate(() => {
    const element = document.querySelector(
      ".operations-live-map .leaflet-container",
    )!;
    const rect = element.getBoundingClientRect();
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      left: rect.left,
      right: rect.right,
      height: rect.height,
    };
  });
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.left).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.height).toBeGreaterThanOrEqual(270);

  await page.getByRole("button", { name: "Abrir navegación" }).click();
  await expect(page.locator(".app-navigation")).toHaveClass(/open/);
  await expect(page.locator(".nav-backdrop")).toBeVisible();

  const backdropCoversMap = await page.evaluate(() => {
    const mapRect = document
      .querySelector(".operations-live-map")!
      .getBoundingClientRect();
    const topElement = document.elementFromPoint(
      window.innerWidth - 8,
      Math.min(window.innerHeight - 8, Math.max(80, mapRect.top + 20)),
    );
    return topElement?.classList.contains("nav-backdrop") ?? false;
  });
  expect(backdropCoversMap).toBe(true);
});

test("el recorrido y su leyenda permanecen dentro de la tarjeta móvil", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockMobileOperations(page);
  await login(page);

  await page.getByRole("button", { name: "Abrir navegación" }).click();
  await page.getByRole("link", { name: "Recorridos y jornadas" }).click();
  const seller = page.getByLabel("Responsable");
  await seller.selectOption({ label: "María Responsable" });
  await expect(seller).toHaveValue("seller-1");
  await page.getByRole("button", { name: "Ver detalle" }).click();

  const map = page.locator(".operations-map .leaflet-container");
  await expect(map).toBeVisible();
  await expect(page.locator(".workday-map-legend")).toBeVisible();

  const layout = await page.evaluate(() => {
    const mapRect = document
      .querySelector(".operations-map .leaflet-container")!
      .getBoundingClientRect();
    const cardRect = document
      .querySelector(".operations-map-card")!
      .getBoundingClientRect();
    const legend = document.querySelector(".workday-map-legend")!;
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      mapLeft: mapRect.left,
      mapRight: mapRect.right,
      cardLeft: cardRect.left,
      cardRight: cardRect.right,
      mapHeight: mapRect.height,
      legendPosition: getComputedStyle(legend).position,
    };
  });

  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.mapLeft).toBeGreaterThanOrEqual(layout.cardLeft);
  expect(layout.mapRight).toBeLessThanOrEqual(layout.cardRight);
  expect(layout.mapHeight).toBeGreaterThanOrEqual(300);
  expect(layout.legendPosition).toBe("static");
});
