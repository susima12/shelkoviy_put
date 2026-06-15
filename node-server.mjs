import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import handler from "./dist/server/server.js";

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";
const CLIENT_DIR = new URL("./dist/client/", import.meta.url);
const UPLOADS_DIR = new URL("./data/uploads/", import.meta.url);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 25_000;

const MIME = {
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

async function tryServeStatic(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/" || urlPath.endsWith("/")) return false;

  const filePath = urlPath.startsWith("/uploads/")
    ? new URL("./" + urlPath.replace(/^\/uploads\//, ""), UPLOADS_DIR)
    : new URL("." + urlPath, CLIENT_DIR);
  try {
    const s = await stat(filePath);
    if (!s.isFile()) return false;
    const data = await readFile(filePath);
    const type = MIME[extname(filePath.pathname).toLowerCase()] || "application/octet-stream";
    res.statusCode = 200;
    res.setHeader("content-type", type);
    if (urlPath.startsWith("/assets/")) {
      res.setHeader("cache-control", "public, max-age=31536000, immutable");
    } else if (urlPath.startsWith("/uploads/") || /\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$/.test(urlPath)) {
      res.setHeader("cache-control", "public, max-age=86400");
    }
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

function toWebRequest(req) {
  const url = `http://${req.headers.host || "localhost"}${req.url}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((vv) => headers.append(k, vv));
    else if (v != null) headers.set(k, String(v));
  }
  const init = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = new ReadableStream({
      start(controller) {
        req.on("data", (c) => controller.enqueue(c));
        req.on("end", () => controller.close());
        req.on("error", (e) => controller.error(e));
      },
    });
    init.duplex = "half";
  }
  return new Request(url, init);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), ms);
    }),
  ]);
}

const server = createServer(async (req, res) => {
  res.setHeader("connection", "keep-alive");
  res.setHeader("keep-alive", "timeout=5");

  try {
    if (await tryServeStatic(req, res)) return;

    const webReq = toWebRequest(req);
    const webRes = await withTimeout(handler.fetch(webReq), REQUEST_TIMEOUT_MS);

    res.statusCode = webRes.status;
    webRes.headers.forEach((value, key) => {
      if (key.toLowerCase() === "transfer-encoding") return;
      res.setHeader(key, value);
    });

    if (webRes.body) {
      const reader = webRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.statusCode = err?.message === "Request timeout" ? 504 : 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end(err?.message === "Request timeout" ? "Gateway Timeout" : "Internal Server Error");
    } else {
      res.end();
    }
  }
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

server.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
