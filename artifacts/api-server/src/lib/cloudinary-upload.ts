import { v2 as cloudinary } from "cloudinary";

export interface CloudinaryConfig { cloudName: string; apiKey: string; apiSecret: string }

export function getCloudinaryConfig(env: NodeJS.ProcessEnv = process.env): CloudinaryConfig | null {
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

export function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string): string {
  return cloudinary.utils.api_sign_request(params, apiSecret);
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
