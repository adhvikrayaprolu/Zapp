// Regenerate the README screenshots in docs/screenshots/ from the running local app.
//
// Uses an installed Google Chrome in headless mode over the DevTools protocol with a
// throwaway profile (no npm dependencies; needs Node 22+ for the built-in WebSocket).
// Start the app first (./scripts/dev.sh), then:
//
//   node scripts/capture-screenshots.mjs            # writes docs/screenshots/*.png
//   CHROME_PATH=/path/to/chrome node scripts/capture-screenshots.mjs
//
// spending.png is a clipped close-up of the dashboard's spending section.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "screenshots");
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const APP = "http://127.0.0.1:5173";
const PORT = 9333;
mkdirSync(OUT, { recursive: true });

const profile = mkdtempSync(join(tmpdir(), "zapp-shots-"));
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--force-dark-mode",
  "--window-size=1440,900", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function targetWs() {
  for (let i = 0; i < 150; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome did not start");
}

const ws = new WebSocket(await targetWs());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let nextId = 0;
const pending = new Map();
const listeners = [];
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method) listeners.forEach((l) => l(msg));
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`${expression}\n${JSON.stringify(r.exceptionDetails)}`);
  return r.result.value;
};

await send("Page.enable");
await send("Runtime.enable");
// Headless pages count as unfocused/hidden, which throttles requestAnimationFrame and leaves
// motion fade-ins stuck at opacity 0. Emulate focus so animations run to completion.
await send("Emulation.setFocusEmulationEnabled", { enabled: true });
await send("Page.setWebLifecycleState", { state: "active" });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });

async function viewport(width, height, mobile = false) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
}
async function go(path, settle = 3500) {
  const loaded = new Promise((r) => {
    const l = (m) => { if (m.method === "Page.loadEventFired") { listeners.splice(listeners.indexOf(l), 1); r(); } };
    listeners.push(l);
  });
  await send("Page.navigate", { url: APP + path });
  await loaded;
  await sleep(settle);
}
async function waitFor(expression, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(`!!(${expression})`)) return;
    await sleep(150);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}
const byText = (sel, text) =>
  `[...document.querySelectorAll(${JSON.stringify(sel)})].find(e => e.textContent.trim().toLowerCase().includes(${JSON.stringify(text.toLowerCase())}))`;
async function click(expression) {
  await waitFor(expression);
  await evaluate(`(${expression}).click()`);
}
async function type(selector, text) {
  await waitFor(`document.querySelector(${JSON.stringify(selector)})`);
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await send("Input.insertText", { text });
}
async function shot(name) {
  const faded = await evaluate(`[...document.querySelectorAll("main *")].filter(e => getComputedStyle(e).opacity === "0" && e.getBoundingClientRect().height > 40).length`);
  if (faded) console.log(`  ${name}: ${faded} element(s) still at opacity 0`);
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, "base64"));
  console.log("saved", name);
}

try {
  // Public pages. (The desktop waitlist's Google Drive video embed doesn't render headless.)
  await viewport(390, 844, true);
  await go("/waitlist", 4000);
  await shot("waitlist-mobile");

  await viewport(1440, 900);
  await go("/login");
  await waitFor(byText("button", "Try the demo account"));
  await sleep(800);
  await shot("login");

  // Sign in through the real demo button.
  await click(byText("button", "Try the demo account"));
  await waitFor(`location.pathname === "/home"`);
  await sleep(4000);

  // The reflection prompt auto-opens on the first dashboard visit of the day.
  if (await evaluate(`!!document.querySelector('[role="dialog"]')`)) {
    await shot("reflection-prompt");
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await sleep(1000);
  }

  await viewport(1440, 1700);
  await go("/home", 1000);
  // Lazy chunks can take a while on a cold dev-server cache: wait for real content.
  await waitFor(`document.body.innerText.includes("SPENT THIS MONTH") && document.body.innerText.includes("STREAK") && document.querySelector(".recharts-area-curve")`, 60000);
  await sleep(3000);
  await evaluate(`window.scrollTo(0, 0)`);
  await shot("dashboard");
  try {
    const spending = join(OUT, "spending.png");
    const clip = await evaluate(`(() => {
      const label = [...document.querySelectorAll("h2")].find((h) => /spent this month/i.test(h.textContent));
      const r = label.closest(".grid").getBoundingClientRect();
      return { x: 0, y: Math.max(0, r.top + scrollY - 24), width: innerWidth, height: r.height + 48, scale: 1 };
    })()`);
    writeFileSync(spending, Buffer.from((await send("Page.captureScreenshot", { format: "png", clip })).data, "base64"));
    console.log("saved spending");
  } catch (e) {
    console.log("spending crop skipped:", e.message);
  }

  await viewport(1440, 900);
  await go("/transactions", 1000);
  await waitFor(`(() => { const m = document.body.innerText.match(/TOTAL TRANSACTIONS\\s+(\\d+)/); return m && Number(m[1]) > 0; })()`, 60000);
  await sleep(2500);
  await shot("transactions");

  await go("/subscriptions", 5000);
  await shot("subscriptions");

  await go("/search", 4000);
  await shot("decision-engine");

  await type('input[aria-label="What are you thinking of buying?"]', "Wireless headphones");
  await click(byText("button", "Evaluate"));
  await type("#buy-advisor-price", "249");
  await click(byText("button", "Consult my CFO"));
  await waitFor(byText('[role="dialog"] *', "Why"));
  await sleep(1200);
  await shot("buy-advisor");

  await go("/home", 1000);
  await waitFor(`document.body.innerText.includes("STREAK") && document.querySelector(".recharts-area-curve")`, 60000);
  await sleep(2500);
  await click(`document.querySelector('[aria-label="Open Zapp assistant"]')`);
  await type('input[placeholder="Ask ZappBot anything..."]', "Which subscription gives me the least value?");
  await click(`document.querySelector('button[aria-label="Send message"]') || document.querySelector('input[placeholder="Ask ZappBot anything..."]').closest("form").querySelector('button[type="submit"]')`);
  await waitFor(`document.body.innerText.includes("lowest-value subscription")`, 20000);
  await sleep(1500);
  await shot("zappbot");
} finally {
  ws.close();
  chrome.kill();
}
