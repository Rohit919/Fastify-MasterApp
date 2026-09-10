import { expect, test } from "@playwright/test";

test("login and recovery entry points are accessible", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  const response = await page.goto("/login");
  expect(response?.status()).toBe(200);
  await page.waitForLoadState("networkidle");
  expect(runtimeErrors).toEqual([]);
  expect(await page.locator("body").innerText()).toContain("Admin Login");
  await expect(
    page.getByRole("heading", { name: "Admin Login" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(
    page.getByRole("heading", { name: "Reset password" }),
  ).toBeVisible();
});
