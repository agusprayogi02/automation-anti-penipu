/**
 * One-shot flow: login → pin → otp → error.
 *
 * `.env`: BASE_URL, LOGIN_PATH (required). Optional: FORM_PHONE, FORM_PIN, FORM_OTP.
 * Tiap run memakai User-Agent diambil acak dari 30 string (mobile).
 * `RUN_COUNT` default 1, maks 30.
 */

import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(projectRoot, ".env") });

const baseUrl = process.env.BASE_URL?.replace(/\/$/, "");
const loginPath = process.env.LOGIN_PATH;
const runCount = Number(process.env.RUN_COUNT ?? 100);

/** Login: `input.phone-input`, CTA `button.button` (“Lanjutkan”). */
const LOGIN = {
  phone: "input.phone-input",
  continue: "button.button",
};

/** 30 mobile User-Agents; satu dipilih acak per run. */
const USER_AGENTS = [
  "Mozilla/5.0 (Linux; Android 15; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.39 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; 22081212G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.100 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; CPH2447) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.146 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; V2207) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.6533.103 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.71 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; SM-A556E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.39 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; Scorpio) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; motorola edge 40) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.113 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; Nokia G42 5G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.118 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-F946B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11; Redmi Note 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.178 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; Infinix X6835B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; RMX3471) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; TECNO KI5k) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.193 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; Nothing A142) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.39 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; ASUS_AI2302) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.111 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5845.192 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.39 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; SM-S916B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/125.0.6422.165 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; WLZ-AN10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.58 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; TB328FU) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.100 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; SH-53C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.146 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11; LM-Q720) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5938.154 Mobile Safari/537.36",
];

function pickUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function rndDigits(n) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
}

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

async function runOnce() {
  requireEnv();
  const { phone, pinRaw, otpRaw, phoneFromEnv, pinFromEnv, otpFromEnv } = loadFormData();
  const userAgent = pickUserAgent();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
  });
  const page = await context.newPage();

  try {
    console.log("User-Agent:", userAgent.slice(0, 72) + (userAgent.length > 72 ? "…" : ""));

    await page.goto(`${baseUrl}${loginPath}`, { waitUntil: "domcontentloaded", timeout: 30_000 });

    await page.locator(LOGIN.phone).fill(phone);
    const goBtn = page.locator(`${LOGIN.continue}:not([disabled])`);
    await goBtn.click({ timeout: 15_000 });

    await page.waitForURL(
      (u) => u.pathname.endsWith("pin.html") || u.href.includes("pin.html"),
      { timeout: 30_000 },
    );

    await fillOtpBoxes(page, pinRaw);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => { });

    await page.waitForURL(
      (u) => u.pathname.endsWith("otp.html") || u.href.includes("otp.html"),
      { timeout: 30_000 },
    );

    await fillOtpBoxes(page, otpRaw);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => { });

    await page.waitForURL(
      (u) => u.pathname.endsWith("error.html") || u.href.includes("error.html"),
      { timeout: 30_000 },
    );

    console.log("Run finished (login → PIN → OTP → error page).");
    console.log("Data sources:", {
      phone: phoneFromEnv ? "env" : `random (${phone})`,
      pin: pinFromEnv ? "env" : `random (${pinRaw})`,
      otp: otpFromEnv ? "env" : `random (${otpRaw})`,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  for (let i = 0; i < runCount; i++) {
    if (runCount > 1) {
      console.log(`--- Run ${i + 1}/${runCount} ---`);
    }
    await runOnce();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
