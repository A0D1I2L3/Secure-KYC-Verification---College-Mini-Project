"use strict";

const http = require("node:http");
const { runLibraryDemo } = require("./demo-core.cjs");

const HOST = process.env.DEMO_API_HOST || "127.0.0.1";
const PORT = Number(process.env.DEMO_API_PORT || 5174);

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);

  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 4096) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && req.url === "/api/demo/health") {
    sendJson(res, 200, { ok: true, service: "kyc-encrypt-demo-api" });
    return;
  }

  if (req.method === "POST" && req.url === "/api/demo/aadhaar") {
    try {
      const body = await readJson(req);
      const result = await runLibraryDemo(body.aadhaar, {
        recoveryShares: body.recoveryShares,
      });
      sendJson(res, 200, { ok: true, result });
    } catch (error) {
      sendJson(res, error.statusCode || 500, {
        ok: false,
        error: error.message || "Demo API failed.",
      });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found." });
});

server.listen(PORT, HOST, () => {
  console.log(`kyc-encrypt demo API listening on http://${HOST}:${PORT}`);
});
