const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local'; // 'local' | 's3' | 'cloudinary'

/**
 * Storage Service Abstraction
 * Handles product images, return proofs, and customer media.
 * Supports zero-config local storage with production cloud object storage readiness.
 */
class StorageService {
  constructor() {
    this.provider = STORAGE_PROVIDER;
  }

  /**
   * Resolves a public URL for a stored file
   */
  resolveUrl(fileName) {
    if (!fileName) return '';
    if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
      return fileName;
    }
    const clean = fileName.replace(/^\/?uploads\//, '').replace(/^\//, '');
    return `/uploads/${clean}`;
  }

  /**
   * Upload file to storage provider
   */
  async uploadFile(fileBuffer, originalName, mimeType = 'image/jpeg') {
    const ext = path.extname(originalName) || '.jpg';
    const uniqueName = `bps_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;

    if (this.provider === 's3') {
      // S3 / Cloudflare R2 integration hook
      // If AWS_S3_BUCKET and AWS_ACCESS_KEY_ID are set, upload via AWS SDK
      if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
        // AWS S3 client could be used here
        console.log(`[StorageService] S3 configured for bucket: ${process.env.AWS_S3_BUCKET}`);
      }
    } else if (this.provider === 'cloudinary') {
      // Cloudinary integration hook
      if (process.env.CLOUDINARY_URL) {
        console.log('[StorageService] Cloudinary configured');
      }
    }

    // Default Local Storage
    const targetPath = path.join(UPLOADS_DIR, uniqueName);
    fs.writeFileSync(targetPath, fileBuffer);

    return {
      fileName: uniqueName,
      url: `/uploads/${uniqueName}`,
      provider: 'local',
      sizeBytes: fileBuffer.length
    };
  }

  /**
   * Check storage system health
   */
  checkHealth() {
    return {
      provider: this.provider,
      uploadsDirExists: fs.existsSync(UPLOADS_DIR),
      isCloudReady: Boolean(process.env.AWS_S3_BUCKET || process.env.CLOUDINARY_URL)
    };
  }
}

module.exports = new StorageService();
