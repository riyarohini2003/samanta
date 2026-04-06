import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

/**
 * Upload a buffer to Cloudinary and return the result.
 * @param buffer  - The file buffer
 * @param folder  - Cloudinary folder path (e.g. "samanta/customers")
 * @param options - Extra upload options (resource_type defaults to "image")
 */
export function uploadBuffer(
  buffer: Buffer,
  folder: string,
  options?: Record<string, unknown>,
): Promise<{ secure_url: string; public_id: string; bytes: number; format: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `samanta/${folder}`,
        resource_type: "auto",
        ...options,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          bytes: result.bytes,
          format: result.format,
        });
      },
    );
    stream.end(buffer);
  });
}

/**
 * Delete an asset from Cloudinary by its public_id.
 */
export async function deleteAsset(publicId: string) {
  return cloudinary.uploader.destroy(publicId);
}
