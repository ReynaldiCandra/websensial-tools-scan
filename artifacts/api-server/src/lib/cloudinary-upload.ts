import crypto from "node:crypto";

export interface CloudinaryConfig { cloudName: string; apiKey: string; apiSecret: string }

export function getCloudinaryConfig(env: NodeJS.ProcessEnv = process.env): CloudinaryConfig | null {
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

export function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string): string {
  const canonical = Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("&");
  return crypto.createHash("sha1").update(canonical + apiSecret).digest("hex");
}

export function cloudinaryUploadSignatureParams(timestamp: number, folder: string) {
  // Only include parameters supported by the signed Upload API. allowed_formats
  // is configured on an upload preset, not sent as a direct upload parameter.
  return { folder, timestamp };
}

export function isCloudinaryImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" && !url.username && !url.password;
  } catch { return false; }
}
