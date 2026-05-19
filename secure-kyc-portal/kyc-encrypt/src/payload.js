"use strict";

const ENVELOPE_VERSION = 1;
const ENVELOPE_MARKER = "kyc-encrypt";

function serializePayload(payload) {
  if (Buffer.isBuffer(payload)) {
    return Buffer.from(
      JSON.stringify({
        marker: ENVELOPE_MARKER,
        version: ENVELOPE_VERSION,
        type: "buffer",
        data: payload.toString("base64"),
      }),
      "utf8",
    );
  }

  if (typeof payload === "string") {
    return Buffer.from(
      JSON.stringify({
        marker: ENVELOPE_MARKER,
        version: ENVELOPE_VERSION,
        type: "string",
        data: payload,
      }),
      "utf8",
    );
  }

  return Buffer.from(
    JSON.stringify({
      marker: ENVELOPE_MARKER,
      version: ENVELOPE_VERSION,
      type: "json",
      data: payload,
    }),
    "utf8",
  );
}

function deserializePayload(buffer) {
  const text = buffer.toString("utf8");

  try {
    const parsed = JSON.parse(text);

    if (parsed.marker !== ENVELOPE_MARKER) {
      return text;
    }

    if (parsed.type === "buffer") {
      return Buffer.from(parsed.data, "base64");
    }

    if (parsed.type === "json") {
      return parsed.data;
    }

    return String(parsed.data);
  } catch {
    return text;
  }
}

module.exports = {
  serializePayload,
  deserializePayload,
};
