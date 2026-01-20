import { expect, test } from "@playwright/test";

test("run demo scenario", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Run Demo Scenario" }).click();
  await page.getByText("Pareto Frontier").waitFor({ state: "visible" });
  await expect(page.getByText("Dispatch Detail")).toBeVisible();
  await page.getByRole("button", { name: "Export Results JSON" }).click();
});
