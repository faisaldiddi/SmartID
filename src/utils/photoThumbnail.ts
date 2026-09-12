/**
 * Photo Thumbnail Service for SmartID (Level 1 Frontend-Only)
 *
 * Creates ultra-compact portable WebP/JPEG thumbnails (e.g. 48x60) for QR embedding.
 * Only embedded if the total verification payload remains within safe QR size limits.
 * If omitted or unavailable, an initials avatar is rendered cleanly.
 */

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * Generates an ultra-compact WebP/JPEG thumbnail from any image source (Data URL, Blob URL, etc.)
 * Crops to center-cover aspect ratio matching standard ID card photo frame (4:5).
 */
export async function createPortablePhotoThumbnail(
  sourceUrl: string,
  options: ThumbnailOptions = {}
): Promise<string | null> {
  if (!sourceUrl || typeof sourceUrl !== 'string' || sourceUrl.trim() === '') {
    return null;
  }

  // If running in non-browser environment (Node / SSR)
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const targetWidth = options.width || 44;
  const targetHeight = options.height || 55;
  const quality = options.quality ?? 0.5;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeout = setTimeout(() => {
      resolve(null);
    }, 2500);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(null);
          return;
        }

        // Center-crop (cover) calculation
        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;

        if (!imgWidth || !imgHeight) {
          resolve(null);
          return;
        }

        const targetAspect = targetWidth / targetHeight;
        const imgAspect = imgWidth / imgHeight;

        let srcX = 0;
        let srcY = 0;
        let srcW = imgWidth;
        let srcH = imgHeight;

        if (imgAspect > targetAspect) {
          // Source is wider: crop horizontal sides
          srcW = imgHeight * targetAspect;
          srcX = (imgWidth - srcW) / 2;
        } else {
          // Source is taller: crop vertical sides
          srcH = imgWidth / targetAspect;
          srcY = (imgHeight - srcH) / 2;
        }

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetWidth, targetHeight);

        // Try WebP first for optimal compression
        let dataUrl = canvas.toDataURL('image/webp', quality);

        // Fallback to JPEG if WebP produced PNG fallback or is not supported
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };

    img.src = sourceUrl;
  });
}
