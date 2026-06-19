#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createConnection, createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHAPTERS = (process.env.CODE_LIFE_SMOKE_CHAPTERS ?? "trash-mountain,camera-eye,printer-belly,dev-board")
  .split(",")
  .map((chapter) => chapter.trim())
  .filter(Boolean);
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 720, mobile: false },
  { name: "mobile", width: 390, height: 844, mobile: true },
];

const preview = { process: undefined, logs: "" };
const chrome = { process: undefined, profile: undefined };

async function main() {
  try {
    const previewPort = Number(process.env.CODE_LIFE_SMOKE_PREVIEW_PORT ?? await findFreePort());
    const cdpPort = Number(process.env.CODE_LIFE_SMOKE_CDP_PORT ?? await findFreePort());
    const url = process.env.CODE_LIFE_SMOKE_URL ?? `http://127.0.0.1:${previewPort}/`;

    if (!process.env.CODE_LIFE_SMOKE_URL) {
      preview.process = startPreview(previewPort);
      await waitForHttp(url, 20000);
    }

    chrome.process = startChrome(cdpPort);
    await waitForHttp(`http://127.0.0.1:${cdpPort}/json/version`, 20000);

    const results = [];
    for (const viewport of VIEWPORTS) {
      const page = await openCdpPage(cdpPort, url);
      try {
        await page.send("Emulation.setDeviceMetricsOverride", {
          width: viewport.width,
          height: viewport.height,
          deviceScaleFactor: 1,
          mobile: viewport.mobile,
        });
        await page.send("Page.navigate", { url });
        await delay(2600);
        await startRun(page);

        for (const chapterId of CHAPTERS) {
          const result = await sampleChapter(page, chapterId, viewport);
          results.push(result);
          assertChapterResult(result);
        }

        const badEvents = page.events.filter((event) => event.method === "Runtime.exceptionThrown");
        if (badEvents.length > 0) {
          throw new Error(`Runtime exceptions in ${viewport.name}: ${JSON.stringify(badEvents.slice(0, 2), null, 2)}`);
        }
      } finally {
        page.close();
      }
    }

    console.log(JSON.stringify({ ok: true, chapters: CHAPTERS, results: summarizeResults(results) }, null, 2));
  } finally {
    cleanup();
  }
}

async function startRun(page) {
  await page.evalValue(`(() => {
    window.dispatchEvent(new CustomEvent('ui:start-run', { detail: {
      prompt: 'code life smoke test',
      customization: {
        body: 'pixel-core',
        personality: 'curious',
        startingSkill: 'wall-stick',
        petSpecies: 'cat'
      }
    }}));
    window.dispatchEvent(new PointerEvent('pointerdown', { clientX: 500, clientY: 280, bubbles: true }));
    return true;
  })()`);
  await delay(1200);
}

async function sampleChapter(page, chapterId, viewport) {
  await page.evalValue(`((chapterId) => {
    const select = document.querySelector('[data-ref="gmChapterSelect"]');
    if (!select) throw new Error('Missing GM chapter select');
    select.value = chapterId;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointerdown', { clientX: 500, clientY: 280, bubbles: true }));
    return select.value;
  })(${JSON.stringify(chapterId)})`);
  await delay(2200);

  const dom = await page.evalValue(`(() => {
    const canvas = document.querySelector('#game-root canvas, canvas');
    const rect = canvas?.getBoundingClientRect();
    const hud = document.querySelector('.hud');
    const abilityRoot = document.querySelector('[data-ref="abilities"]');
    const abilityItems = abilityRoot ? [...abilityRoot.children] : [];
    return {
      rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
      chapterText: document.querySelector('[data-ref="chapter"]')?.textContent?.trim() ?? '',
      hudMode: hud?.dataset.mode || hud?.dataset.hudMode || null,
      canvasCount: document.querySelectorAll('canvas').length,
      canvasIntrinsic: canvas ? { width: canvas.width, height: canvas.height } : null,
      imageRendering: canvas ? getComputedStyle(canvas).imageRendering : null,
      bossText: document.querySelector('[data-ref="boss"]')?.textContent?.trim() ?? '',
      bossBarWidth: document.querySelector('[data-ref="bossBar"]')?.style.width ?? '',
      integrityBarWidth: document.querySelector('[data-ref="integrityBar"]')?.style.width ?? '',
      massBarWidth: document.querySelector('[data-ref="massBar"]')?.style.width ?? '',
      abilityOverflow: abilityItems.some((el) => el.scrollWidth > el.clientWidth + 1)
    };
  })()`);

  const clip = dom.rect
    ? {
        x: Math.max(0, dom.rect.x),
        y: Math.max(0, dom.rect.y),
        width: Math.max(1, dom.rect.width),
        height: Math.max(1, dom.rect.height),
        scale: 1,
      }
    : undefined;
  const firstShot = await page.send("Page.captureScreenshot", { format: "png", clip });
  await delay(650);
  const secondShot = await page.send("Page.captureScreenshot", { format: "png", clip });
  const first = decodePngMetrics(firstShot.result.data);
  const second = decodePngMetrics(secondShot.result.data);

  return {
    viewport: viewport.name,
    chapterId,
    ...dom,
    screenshotSize: { width: first.width, height: first.height },
    screenshot: first.metrics,
    frameDiff: compareDecoded(first, second),
  };
}

function assertChapterResult(result) {
  const totalPixels = result.screenshotSize.width * result.screenshotSize.height;
  const nonDarkRatio = result.screenshot.nonDark / totalPixels;
  const saturatedRatio = result.screenshot.saturated / totalPixels;
  const diffRatio = result.frameDiff / totalPixels;
  const failures = [];

  if (result.hudMode !== "code-life") failures.push(`HUD mode is ${result.hudMode}`);
  if (result.canvasCount !== 1) failures.push(`canvasCount is ${result.canvasCount}`);
  if (result.canvasIntrinsic?.width !== 960 || result.canvasIntrinsic?.height !== 540) {
    failures.push(`canvas intrinsic is ${JSON.stringify(result.canvasIntrinsic)}`);
  }
  if (result.imageRendering !== "pixelated") failures.push(`imageRendering is ${result.imageRendering}`);
  if (!result.bossText.includes("WEAK ")) failures.push(`boss text missing weakness: ${result.bossText}`);
  if (Number.parseFloat(result.bossBarWidth) <= 0) failures.push(`bossBarWidth is ${result.bossBarWidth}`);
  if (result.abilityOverflow) failures.push("ability strip overflowed");
  if (nonDarkRatio < 0.18) failures.push(`nonDarkRatio ${nonDarkRatio.toFixed(3)} too low`);
  if (saturatedRatio < 0.015) failures.push(`saturatedRatio ${saturatedRatio.toFixed(3)} too low`);
  if (result.screenshot.variance < 180) failures.push(`variance ${result.screenshot.variance.toFixed(1)} too low`);
  if (result.screenshot.uniqueBuckets < 120) failures.push(`uniqueBuckets ${result.screenshot.uniqueBuckets} too low`);
  if (diffRatio < 0.015) failures.push(`frameDiffRatio ${diffRatio.toFixed(3)} too low`);

  if (failures.length > 0) {
    throw new Error(`${result.viewport}/${result.chapterId} smoke failed: ${failures.join("; ")}`);
  }
}

function summarizeResults(results) {
  return results.map((result) => ({
    viewport: result.viewport,
    chapterId: result.chapterId,
    chapterText: result.chapterText,
    bossText: result.bossText,
    nonDark: result.screenshot.nonDark,
    saturated: result.screenshot.saturated,
    variance: Number(result.screenshot.variance.toFixed(1)),
    uniqueBuckets: result.screenshot.uniqueBuckets,
    frameDiff: result.frameDiff,
  }));
}

function startPreview(port) {
  const viteBin = path.join(ROOT, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(process.execPath, [viteBin, "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout.on("data", (chunk) => {
    preview.logs += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    preview.logs += chunk.toString();
  });
  child.on("exit", (code) => {
    if (code !== null && code !== 0) {
      preview.logs += `\nvite preview exited with ${code}\n`;
    }
  });
  return child;
}

function startChrome(port) {
  const chromePath = findChromePath();
  chrome.profile = mkdtempSync(path.join(tmpdir(), "code-life-smoke-"));
  return spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${chrome.profile}`,
    "about:blank",
  ], {
    stdio: "ignore",
    windowsHide: true,
  });
}

function findChromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, "Google", "Chrome", "Application", "chrome.exe"),
    process.env["ProgramFiles(x86)"] && path.join(process.env["ProgramFiles(x86)"], "Google", "Chrome", "Application", "chrome.exe"),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("Chrome executable not found. Set CHROME_PATH to run code-life smoke.");
  }
  return found;
}

async function openCdpPage(port, url) {
  const target = await fetchJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  const ws = await createRawWs(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const events = [];
  let stopped = false;

  async function pump() {
    while (!stopped) {
      const raw = await ws.nextMessage(30000).catch(() => null);
      if (!raw) return;
      let message;
      try {
        message = JSON.parse(raw);
      } catch {
        events.push({ method: "parse-error", raw: String(raw).slice(0, 200) });
        continue;
      }
      if (message.id && pending.has(message.id)) {
        pending.get(message.id)(message);
        pending.delete(message.id);
      } else {
        events.push(message);
      }
    }
  }
  void pump();

  function send(method, params = {}) {
    const callId = ++id;
    ws.sendText(JSON.stringify({ id: callId, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(callId);
        reject(new Error(`${method} timeout`));
      }, 20000);
      pending.set(callId, (message) => {
        clearTimeout(timer);
        resolve(message);
      });
    });
  }

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.navigate", { url });
  await delay(2600);

  async function evalValue(expression) {
    const message = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      timeout: 20000,
    });
    if (message.error) throw new Error(JSON.stringify(message.error));
    if (message.result?.exceptionDetails) {
      throw new Error(message.result.exceptionDetails.text ?? JSON.stringify(message.result.exceptionDetails));
    }
    return message.result?.result?.value;
  }

  return {
    events,
    send,
    evalValue,
    close: () => {
      stopped = true;
      ws.close();
    },
  };
}

async function createRawWs(urlString) {
  const url = new URL(urlString);
  const socket = createConnection({ host: url.hostname, port: Number(url.port) });
  let buffer = Buffer.alloc(0);
  const messages = [];
  const waiters = [];
  let closed = false;

  await new Promise((resolve, reject) => {
    const key = randomBytes(16).toString("base64");
    const requestPath = `${url.pathname}${url.search}`;
    const request = [
      `GET ${requestPath} HTTP/1.1`,
      `Host: ${url.host}`,
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Key: ${key}`,
      "Sec-WebSocket-Version: 13",
      "",
      "",
    ].join("\r\n");
    let handshake = Buffer.alloc(0);
    const timer = setTimeout(() => reject(new Error("CDP websocket handshake timeout")), 10000);

    function onData(chunk) {
      handshake = Buffer.concat([handshake, chunk]);
      const marker = handshake.indexOf("\r\n\r\n");
      if (marker === -1) return;
      clearTimeout(timer);
      socket.off("data", onData);
      const header = handshake.subarray(0, marker).toString("utf8");
      if (!header.includes("101")) {
        reject(new Error(header));
        return;
      }
      buffer = handshake.subarray(marker + 4);
      socket.on("data", onFrameData);
      pumpFrames();
      resolve();
    }

    socket.on("error", reject);
    socket.once("connect", () => socket.write(request));
    socket.on("data", onData);
  });

  function deliver(message) {
    if (waiters.length) {
      waiters.shift()(message);
      return;
    }
    messages.push(message);
  }

  function pumpFrames() {
    while (buffer.length >= 2) {
      const opcode = buffer[0] & 0x0f;
      const second = buffer[1];
      let offset = 2;
      let length = second & 0x7f;
      if (length === 126) {
        if (buffer.length < offset + 2) return;
        length = buffer.readUInt16BE(offset);
        offset += 2;
      } else if (length === 127) {
        if (buffer.length < offset + 8) return;
        length = Number(buffer.readBigUInt64BE(offset));
        offset += 8;
      }
      const masked = Boolean(second & 0x80);
      let mask;
      if (masked) {
        if (buffer.length < offset + 4) return;
        mask = buffer.subarray(offset, offset + 4);
        offset += 4;
      }
      if (buffer.length < offset + length) return;
      let payload = buffer.subarray(offset, offset + length);
      buffer = buffer.subarray(offset + length);
      if (masked && mask) {
        const unmasked = Buffer.alloc(payload.length);
        for (let index = 0; index < payload.length; index += 1) {
          unmasked[index] = payload[index] ^ mask[index % 4];
        }
        payload = unmasked;
      }
      if (opcode === 0x1) deliver(payload.toString("utf8"));
      if (opcode === 0x8) {
        closed = true;
        socket.end();
        return;
      }
    }
  }

  function onFrameData(chunk) {
    buffer = Buffer.concat([buffer, chunk]);
    pumpFrames();
  }

  socket.on("close", () => {
    closed = true;
    while (waiters.length) waiters.shift()(null);
  });

  function sendText(text) {
    const payload = Buffer.from(text, "utf8");
    const mask = randomBytes(4);
    let header;
    if (payload.length < 126) {
      header = Buffer.alloc(2);
      header[0] = 0x81;
      header[1] = 0x80 | payload.length;
    } else if (payload.length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 0x80 | 126;
      header.writeUInt16BE(payload.length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(payload.length), 2);
    }
    const masked = Buffer.alloc(payload.length);
    for (let index = 0; index < payload.length; index += 1) {
      masked[index] = payload[index] ^ mask[index % 4];
    }
    socket.write(Buffer.concat([header, mask, masked]));
  }

  function nextMessage(timeoutMs = 10000) {
    if (messages.length) return Promise.resolve(messages.shift());
    if (closed) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("CDP receive timeout")), timeoutMs);
      waiters.push((message) => {
        clearTimeout(timer);
        resolve(message);
      });
    });
  }

  return { sendText, nextMessage, close: () => socket.end() };
}

function decodePngMetrics(base64) {
  const bytes = Buffer.from(base64, "base64");
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idats = [];

  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    offset += 4;
    const type = bytes.subarray(offset, offset + 4).toString("ascii");
    offset += 4;
    const data = bytes.subarray(offset, offset + length);
    offset += length + 4;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idats.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8) throw new Error(`Unsupported PNG bit depth ${bitDepth}`);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0;
  if (!channels) throw new Error(`Unsupported PNG color type ${colorType}`);

  const raw = inflateSync(Buffer.concat(idats));
  const stride = width * channels;
  const pixels = Buffer.alloc(width * height * channels);
  let rawOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset++];
    const rowOffset = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[rawOffset++];
      const left = x >= channels ? pixels[rowOffset + x - channels] : 0;
      const up = y > 0 ? pixels[rowOffset - stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[rowOffset - stride + x - channels] : 0;
      let reconstructed = value;
      if (filter === 1) reconstructed = (value + left) & 255;
      else if (filter === 2) reconstructed = (value + up) & 255;
      else if (filter === 3) reconstructed = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) reconstructed = (value + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
      pixels[rowOffset + x] = reconstructed;
    }
  }

  let nonDark = 0;
  let saturated = 0;
  let sum = 0;
  let sumSq = 0;
  const buckets = new Set();
  for (let index = 0; index < pixels.length; index += channels) {
    const r = channels === 1 ? pixels[index] : pixels[index];
    const g = channels === 1 ? pixels[index] : pixels[index + 1];
    const b = channels === 1 ? pixels[index] : pixels[index + 2];
    const value = (r + g + b) / 3;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (value > 12) nonDark += 1;
    if (max - min > 45 && max > 80) saturated += 1;
    sum += value;
    sumSq += value * value;
    if (buckets.size < 8000) buckets.add(`${r >> 4}-${g >> 4}-${b >> 4}`);
  }

  const pixelCount = width * height;
  return {
    width,
    height,
    channels,
    pixels,
    metrics: {
      nonDark,
      saturated,
      mean: sum / pixelCount,
      variance: sumSq / pixelCount - (sum / pixelCount) ** 2,
      uniqueBuckets: buckets.size,
    },
  };
}

function compareDecoded(first, second) {
  const length = Math.min(first.pixels.length, second.pixels.length);
  const channels = first.channels;
  let diff = 0;
  for (let index = 0; index < length; index += channels) {
    const delta =
      Math.abs(first.pixels[index] - second.pixels[index]) +
      Math.abs(first.pixels[index + 1] - second.pixels[index + 1]) +
      Math.abs(first.pixels[index + 2] - second.pixels[index + 2]);
    if (delta > 18) diff += 1;
  }
  return diff;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : undefined;
      server.close(() => port ? resolve(port) : reject(new Error("Unable to allocate port")));
    });
    server.on("error", reject);
  });
}

async function waitForHttp(url, timeoutMs) {
  const started = Date.now();
  let lastError = "";
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error.message;
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}\n${preview.logs}`);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanup() {
  if (preview.process && !preview.process.killed) preview.process.kill();
  if (chrome.process && !chrome.process.killed) chrome.process.kill();
  if (chrome.profile) {
    try {
      rmSync(chrome.profile, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup; Chrome may release the profile a moment later on Windows.
    }
  }
}

process.once("exit", cleanup);
process.once("SIGINT", () => {
  cleanup();
  process.exit(130);
});
process.once("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

main()
  .catch((error) => {
    console.error(error.stack ?? String(error));
    cleanup();
    process.exitCode = 1;
  });
