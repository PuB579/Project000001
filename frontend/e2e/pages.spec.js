import { test, expect } from "@playwright/test";
import { STUDENT, TEACHER, loginAs } from "./helpers";

// เปิดทุกหน้าแล้วตรวจว่าไม่มี JS error และไม่มี API ตอบ 4xx/5xx
function watchErrors(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("response", (res) => {
    if (res.url().startsWith("http://127.0.0.1:8000") && res.status() >= 400) {
      errors.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    }
  });
  return errors;
}

const STUDENT_PAGES = [
  "/dashboard",
  "/checkin",
  "/history",
  "/face-registration",
  "/courses",
  "/schedule",
  "/announcements",
  "/profile",
  "/settings",
];

const TEACHER_PAGES = [
  "/teacher-dashboard",
  "/teacher-courses",
  "/teacher-history",
  "/teacher-report",
  "/teacher-scores",
  "/teacher-students",
  "/teacher-announcements",
  "/teacher-export",
  "/teacher-profile",
  "/teacher-settings",
];

test("หน้า landing เปิดได้", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await expect(page.locator("body")).toContainText("FaceAttend");
  expect(errors).toEqual([]);
});

test.describe("หน้านักศึกษา", () => {
  for (const path of STUDENT_PAGES) {
    test(`เปิด ${path}`, async ({ page }) => {
      await loginAs(page, STUDENT, /\/dashboard$/);
      const errors = watchErrors(page);
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await page.waitForLoadState("networkidle");
      expect(errors).toEqual([]);
    });
  }
});

test.describe("หน้าอาจารย์", () => {
  for (const path of TEACHER_PAGES) {
    test(`เปิด ${path}`, async ({ page }) => {
      await loginAs(page, TEACHER, /\/teacher-dashboard$/);
      const errors = watchErrors(page);
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(errors).toEqual([]);
    });
  }
});
