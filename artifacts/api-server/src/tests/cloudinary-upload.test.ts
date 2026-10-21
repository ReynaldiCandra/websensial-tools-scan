import assert from "node:assert/strict";
import crypto from "node:crypto";
import { before, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { getCloudinaryConfig, isCloudinaryImageUrl, signCloudinaryParams } from "../lib/cloudinary-upload";

describe("Cloudinary upload signing", () => {
  it("signs canonical sorted upload parameters", () => {
    const params = { timestamp: 1710000000, folder: "websensial/previews/3", public_id: "hero-abc", allowed_formats: "jpg,png,webp,avif", overwrite: "false" };
    const expected = crypto.createHash("sha1").update("allowed_formats=jpg,png,webp,avif&folder=websensial/previews/3&overwrite=false&public_id=hero-abc&timestamp=1710000000secret").digest("hex");
    assert.equal(signCloudinaryParams(params, "secret"), expected);
  });
  it("does not configure upload without all server credentials", () => {
    assert.equal(getCloudinaryConfig({}), null);
    assert.deepEqual(getCloudinaryConfig({ CLOUDINARY_CLOUD_NAME: "demo", CLOUDINARY_API_KEY: "key", CLOUDINARY_API_SECRET: "secret" }), { cloudName: "demo", apiKey: "key", apiSecret: "secret" });
    assert.equal(isCloudinaryImageUrl("https://res.cloudinary.com/demo/image/upload/a.png"), true);
    assert.equal(isCloudinaryImageUrl("https://example.com/image.png"), false);
    assert.equal(isCloudinaryImageUrl("javascript:alert(1)"), false);
  });
});


describe("Cloudinary signed-upload endpoint", () => {
  let app: Express;
  before(async () => {
    process.env.NODE_ENV = "production";
    process.env.ADMIN_API_KEY = "cloudinary-test-key";
    process.env.SESSION_SECRET = "cloudinary-test-session-secret";
    process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "demo-api-key";
    process.env.CLOUDINARY_API_SECRET = "demo-api-secret";
    ({ default: app } = await import("../app"));
  });

  it("requires auth, restricts asset kinds, and never returns the secret", async () => {
    const denied = await request(app).post("/api/previews/upload-signature").send({ prospectId: 12, assetType: "logo" });
    assert.equal(denied.status, 401);
    const invalid = await request(app).post("/api/previews/upload-signature").set("x-api-key", "cloudinary-test-key").send({ prospectId: 12, assetType: "video" });
    assert.equal(invalid.status, 400);
    const response = await request(app).post("/api/previews/upload-signature").set("x-api-key", "cloudinary-test-key").send({ prospectId: 12, assetType: "hero" });
    assert.equal(response.status, 200);
    assert.equal(response.body.cloudName, "demo-cloud");
    assert.equal(response.body.apiKey, "demo-api-key");
    assert.equal(response.body.folder, "websensial/previews/12");
    assert.match(response.body.publicId, /^hero-[a-f0-9]{16}$/);
    assert.match(response.body.signature, /^[a-f0-9]{40}$/);
    assert.equal(JSON.stringify(response.body).includes("demo-api-secret"), false);
    assert.equal(response.body.maxFileBytes, 10 * 1024 * 1024);
  });
});
