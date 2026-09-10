import { expect, test } from "@playwright/test";

test("login and recovery entry points are accessible", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  const response = await page.goto("/login");
  expect(response?.status()).toBe(200);
  expect(runtimeErrors).toEqual([]);
  await expect(
    page.getByRole("heading", { name: "Admin Login" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(
    page.getByRole("heading", { name: "Reset password" }),
  ).toBeVisible();
});
