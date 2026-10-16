import { test, expect } from "@playwright/test";
import { STUDENT, TEACHER, login, loginAs } from "./helpers";

test.describe("หน้า login", () => {
  test("แจ้งเตือนเมื่อไม่กรอกข้อมูล", async ({ page }) => {
    await page.goto("/login");
    await page.locator("form").getByRole("button", { name: "เข้าสู่ระบบ" }).click();
    await expect(page.getByText("กรุณากรอกข้อมูลให้ครบถ้วน")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("แจ้งเตือนเมื่อรหัสผ่านสั้นกว่า 6 ตัว", async ({ page }) => {
    await login(page, STUDENT.email, "123");
    await expect(page.locator("form").getByText("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร").first()).toBeVisible();
  });

  test("รหัสผ่านผิดต้องเข้าไม่ได้", async ({ page }) => {
    await login(page, STUDENT.email, "WrongPass1");
    await expect(page.getByText("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("ปุ่มแสดง/ซ่อนรหัสผ่าน", async ({ page }) => {
    await page.goto("/login");
    const pw = page.getByPlaceholder("กรอกรหัสผ่าน");
    await expect(pw).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "แสดงรหัสผ่าน" }).click();
    await expect(pw).toHaveAttribute("type", "text");
  });

  test("นักศึกษา login ด้วยอีเมล", async ({ page }) => {
    await loginAs(page, STUDENT, /\/dashboard$/);
    await expect(page.getByRole("heading", { level: 2 })).toContainText(STUDENT.firstName);
  });

  test("นักศึกษา login ด้วยรหัสนักศึกษา", async ({ page }) => {
    await login(page, STUDENT.code, STUDENT.password);
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  });

  test("อาจารย์ login แล้วไปหน้าแดชบอร์ดอาจารย์", async ({ page }) => {
    await loginAs(page, TEACHER, /\/teacher-dashboard$/);
  });

  test("อาจารย์ login ด้วยรหัสอาจารย์", async ({ page }) => {
    await login(page, TEACHER.code, TEACHER.password);
    await expect(page).toHaveURL(/\/teacher-dashboard$/, { timeout: 15_000 });
  });

  test("ออกจากระบบแล้วเข้าหน้าที่ต้อง login ไม่ได้", async ({ page }) => {
    await loginAs(page, STUDENT, /\/dashboard$/);
    await page.getByRole("link", { name: "ออกจากระบบ" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("การป้องกัน route", () => {
  test("ยังไม่ login เข้าหน้านักศึกษาไม่ได้", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("ยังไม่ login เข้าหน้าอาจารย์ไม่ได้", async ({ page }) => {
    await page.goto("/teacher-dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("นักศึกษาเข้าหน้าอาจารย์ไม่ได้", async ({ page }) => {
    await loginAs(page, STUDENT, /\/dashboard$/);
    await page.goto("/teacher-courses");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("อาจารย์เข้าหน้านักศึกษาไม่ได้", async ({ page }) => {
    await loginAs(page, TEACHER, /\/teacher-dashboard$/);
    await page.goto("/checkin");
    await expect(page).toHaveURL(/\/teacher-dashboard$/);
  });
});
