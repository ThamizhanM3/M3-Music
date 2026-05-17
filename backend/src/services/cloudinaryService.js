import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g. https://<account>.r2.cloudflarestorage.com/<bucket>

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
  console.warn('R2 credentials not fully configured. Check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL.');
}

const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const s3 = new S3Client({
  endpoint,
  region: 'auto',
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

// Keep API shape: multer middleware that stores files in memory, controllers will upload buffers to R2
export const upload = multer({ storage: multer.memoryStorage() });

// Upload a generic buffer to R2 under specified folder. Returns { key, url }
export const uploadFileBuffer = async (buffer, originalName = 'file', folder = 'audio') => {
  const ext = path.extname(originalName) || '';
  const key = `${folder}/${uuidv4()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer
  });

  await s3.send(command);

  const url = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  return { key, url };
};

// Upload artwork buffer specifically
export const uploadFromBuffer = async (buffer, originalName = 'artwork.jpg', folder = 'artwork') => {
  return await uploadFileBuffer(buffer, originalName, folder);
};

// List objects under a folder(prefix). Returns array of items with fields similar to previous Cloudinary resources.
export const getCloudinaryFiles = async (folder = 'audio') => {
  const prefix = folder.replace(/\/$/, '') + '/';
  const files = [];
  let ContinuationToken = undefined;

  do {
    const cmd = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: prefix,
      ContinuationToken
    });
    const res = await s3.send(cmd);
    if (res.Contents) {
      for (const obj of res.Contents) {
        const key = obj.Key;
        files.push({
          public_id: key,
          secure_url: `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`,
          bytes: obj.Size || 0,
          format: path.extname(key).replace('.', ''),
          created_at: obj.LastModified
        });
      }
    }
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);

  return files;
};

export const deleteCloudinaryFile = async (publicId) => {
  const Key = publicId;
  const cmd = new DeleteObjectCommand({ Bucket: R2_BUCKET, Key });
  return await s3.send(cmd);
};

// Utility: generate a signed URL (optional) - placeholder for future use
export const getSignedUrlFor = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
  return await getSignedUrl(s3, command, { expiresIn });
};

export { s3 };
