"use strict";

const { runLibraryDemo } = require("../../frontend/demo-core.cjs");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }

  try {
    const body = typeof req.body === "object" && req.body ? req.body : {};
    const result = await runLibraryDemo(body.aadhaar, {
      recoveryShares: body.recoveryShares,
    });
    res.status(200).json({ ok: true, result });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || "Demo API failed.",
    });
  }
};
