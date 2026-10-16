import { expect } from "@playwright/test";

// บัญชีตัวอย่างจาก backend/seed.py
export const STUDENT = {
  email: "student01@example.com",
  code: "6500001",
  password: "Passw0rd!",
  firstName: "สมหญิง",
};
export const TEACHER = {
  email: "teacher01@example.com",
  code: "T0001",
  password: "Teach123!",
  firstName: "สมชาย",
};

export async function login(page, username, password) {
  await page.goto("/login");
  await page.getByPlaceholder("อีเมล รหัสนักศึกษา หรือรหัสอาจารย์").fill(username);
  await page.getByPlaceholder("กรอกรหัสผ่าน").fill(password);
  await page.locator("form").getByRole("button", { name: "เข้าสู่ระบบ" }).click();
}

export async function loginAs(page, account, home) {
  await login(page, account.email, account.password);
  await expect(page).toHaveURL(home, { timeout: 15_000 });
}
