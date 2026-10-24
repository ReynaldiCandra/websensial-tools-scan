import assert from "node:assert/strict";
import { v2 as cloudinary } from "cloudinary";
import { before, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { cloudinaryUploadSignatureParams, getCloudinaryConfig, isCloudinaryImageUrl, signCloudinaryParams } from "../lib/cloudinary-upload";

describe("Cloudinary upload signing", () => {
  it("matches the Cloudinary SDK signature for canonical upload parameters", () => {
    const params = { folder: "websensial/previews/3", timestamp: 1710000000 };
    assert.equal(signCloudinaryParams(params, "secret"), cloudinary.utils.api_sign_request(params, "secret"));
  });
  it("signs only parameters supported by Cloudinary's signed browser upload", () => {
    const params = cloudinaryUploadSignatureParams(1710000000, "websensial/previews/3");
    assert.deepEqual(params, { folder: "websensial/previews/3", timestamp: 1710000000 });
    assert.equal(signCloudinaryParams(params, "secret"), cloudinary.utils.api_sign_request(params, "secret"));
    assert.equal("allowed_formats" in params, false);
    assert.equal("public_id" in params, false);
    assert.equal("overwrite" in params, false);
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
    assert.equal(response.body.timestamp > 0, true);
    const signedParams = cloudinaryUploadSignatureParams(response.body.timestamp, response.body.folder);
    assert.equal(signCloudinaryParams(signedParams, "demo-api-secret"), response.body.signature);
    assert.equal(response.body.signature, cloudinary.utils.api_sign_request(signedParams, "demo-api-secret"));
    assert.deepEqual(Object.keys(response.body).sort(), ["apiKey", "cloudName", "folder", "maxFileBytes", "signature", "timestamp"].sort());
    assert.match(response.body.signature, /^[a-f0-9]{40}$/);
    assert.equal(JSON.stringify(response.body).includes("demo-api-secret"), false);
    assert.equal(response.body.maxFileBytes, 10 * 1024 * 1024);
  });
});
