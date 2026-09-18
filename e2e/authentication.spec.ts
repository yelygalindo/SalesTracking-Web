import { expect, test, type Page } from "@playwright/test";

const apiUrl = "http://127.0.0.1:5000";

async function mockPlatformAdminApi(page: Page) {
  await page.route(`${apiUrl}/api/auth/login`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken: "e2e-access-token",
        refreshToken: "e2e-refresh-token",
        expiresAtUtc: "2099-01-01T00:00:00Z",
        user: {
          id: 1,
          externalId: "usr_platform",
          username: "platform",
          fullName: "Administradora Plataforma",
          email: "platform@example.com",
          company: {
            id: 1,
            externalId: "cmp_platform",
            name: "UrbanTrack",
          },
          roles: ["platform_admin"],
          permissions: [],
        },
      }),
    });
  });
  await page.route(`${apiUrl}/api/companies/current/time-zone`, (route) =>
    route.fulfill({ status: 403, contentType: "application/json", body: "{}" }),
  );
  await page.route(new RegExp(`${apiUrl}/api/companies(?:\\?.*)?$`), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      }),
    }),
  );
}

test("redirige al login cuando no existe una sesión", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: /Inicia sesi/ }),
  ).toBeVisible();
});

test("platform_admin inicia sesión y entra a Administración", async ({
  page,
}) => {
  await mockPlatformAdminApi(page);
  await page.goto("/login");

  await page.locator("#email").fill("platform@example.com");
  await page.locator("#password").fill("secret-password");
  await page.getByRole("button", { name: /Iniciar sesi/ }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: "Administración" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Administración" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Empresas" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Resumen" })).toHaveCount(0);
});
