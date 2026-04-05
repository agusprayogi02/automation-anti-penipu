/**
 * One-shot flow aligned with login.html → pin.html → otp.html flow
 * (phone on login, circular `.otp-input` boxes on PIN/OTP — auto-submit on last digit).
 *
 * Reads from project root `.env`: BASE_URL, LOGIN_PATH (required). PIN/OTP pages are
 * reached via redirects after submit (pin.html then otp.html, same path folder as login).
 *
 * Optional: FORM_PHONE (10–13 digits, without +62), FORM_PIN, FORM_OTP (length must match
 * number of `.otp-input` on each page — usually 6). Omitted values are generated randomly.
 */

import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(projectRoot, ".env") });

const baseUrl = process.env.BASE_URL?.replace(/\/$/, "");
const loginPath = process.env.LOGIN_PATH;

/** Login: `input.phone-input`, CTA `button.button` (“Lanjutkan”), enabled at 10–13 digits. */
const LOGIN = {
  phone: "input.phone-input",
  continue: "button.button",
};

function rndDigits(n) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
}

/** Local ID mobile without country code; +62 is shown separately in UI. 10–13 digits. */
function rndLocalPhone() {
  const len = 10 + Math.floor(Math.random() * 4);
  let s = "8";
  for (let i = 1; i < len; i++) {
    s += Math.floor(Math.random() * 10);
  }
  return s;
}

function requireEnv() {
  if (!baseUrl) {
    console.error("Set BASE_URL in .env");
    process.exit(1);
  }
  if (!loginPath) {
    console.error("Set LOGIN_PATH in .env");
    process.exit(1);
  }
}

function loadFormData() {
  const phoneEnv = process.env.FORM_PHONE?.replace(/\D/g, "").trim();
  const pinEnv = process.env.FORM_PIN?.replace(/\D/g, "").trim();
  const otpEnv = process.env.FORM_OTP?.replace(/\D/g, "").trim();

  return {
    phone: phoneEnv && phoneEnv.length >= 10 && phoneEnv.length <= 13 ? phoneEnv : rndLocalPhone(),
    pinRaw: pinEnv || rndDigits(6),
    otpRaw: otpEnv || rndDigits(6),
    phoneFromEnv: Boolean(phoneEnv && phoneEnv.length >= 10 && phoneEnv.length <= 13),
    pinFromEnv: Boolean(pinEnv),
    otpFromEnv: Boolean(otpEnv),
  };
}

/**
 * @param {import('playwright').Page} page
 * @param {string | null} digitsFromEnv
 */
async function fillOtpBoxes(page, digitsFromEnv) {
  const inputs = page.locator(".otp-input");
  const count = await inputs.count();
  if (count === 0) {
    throw new Error("No .otp-input elements on page");
  }
  let seq = (digitsFromEnv ?? "").replace(/\D/g, "");
  if (seq.length < count) {
    seq += rndDigits(count - seq.length);
  } else if (seq.length > count) {
    seq = seq.slice(0, count);
  }
  for (let i = 0; i < count; i++) {
    await inputs.nth(i).fill(seq[i]);
  }
}

async function cobaLogin() {
  requireEnv();
  const { phone, pinRaw, otpRaw, phoneFromEnv, pinFromEnv, otpFromEnv } = loadFormData();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${baseUrl}${loginPath}`, { waitUntil: "domcontentloaded", timeout: 30_000 });

    await page.locator(LOGIN.phone).fill(phone);
    const goBtn = page.locator(`${LOGIN.continue}:not([disabled])`);
    await goBtn.click({ timeout: 15_000 });

    await page.waitForURL(
      (u) => u.pathname.endsWith("pin.html") || u.href.includes("pin.html"),
      { timeout: 30_000 },
    ).catch(() => {
      console.error("Failed to load PIN page");
      process.exit(1);
    });

    await fillOtpBoxes(page, pinRaw);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {
      console.error("Failed to load PIN page");
      process.exit(1);
    });

    await page.waitForURL(
      (u) => u.pathname.endsWith("otp.html") || u.href.includes("otp.html"),
      { timeout: 30_000 },
    );

    await fillOtpBoxes(page, otpRaw);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {
      console.error("Failed to load OTP page");
      process.exit(1);
    });

    await page.waitForURL(
      (u) => u.pathname.endsWith("error.html") || u.href.includes("error.html"),
      { timeout: 30_000 },
    );

    console.log("Single run finished (login → PIN → OTP boxes filled).");
    console.log("Data sources:", {
      phone: phoneFromEnv ? "env" : "random" + ": " + phone,
      pin: pinFromEnv ? "env" : "random" + ": " + pinRaw,
      otp: otpFromEnv ? "env" : "random" + ": " + otpRaw,
    });
    console.log("Phone length (digits):", phone.length);
  } finally {
    await browser.close();
  }
}

async function main() {
  for (let i = 0; i < 100_000; i++) {
    await cobaLogin();
  }
  console.log("10 runs finished.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
