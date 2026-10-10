import sharp from 'sharp';
import { SupportAttachment } from './types';

/**
 * Optimizes image attachment for vision AI:
 * - Downscales large screenshots to max 1280x1280 (preserving aspect ratio)
 * - Converts to optimized JPEG (quality 85)
 * - Ensures base64 payload is compact so OTPM/token rate limits are never exceeded
 * - Keeps text, code, and UI elements crisp for OCR
 */
export async function optimizeImageAttachment(attachment: SupportAttachment): Promise<SupportAttachment> {
  if (!attachment || !attachment.url) return attachment;

  try {
    let base64Data = '';
    let mimeType = attachment.type || 'image/jpeg';

    if (attachment.url.startsWith('data:')) {
      const parts = attachment.url.split(',');
      base64Data = parts[1] || '';
      const mimeMatch = parts[0].match(/data:(.*?);base64/);
      if (mimeMatch) mimeType = mimeMatch[1];
    } else {
      base64Data = attachment.url;
    }

    if (!base64Data) return attachment;

    const inputBuffer = Buffer.from(base64Data, 'base64');
    const metadata = await sharp(inputBuffer).metadata();

    const maxDim = 1280;
    const needsResize = (metadata.width && metadata.width > maxDim) || (metadata.height && metadata.height > maxDim);
    const isLarge = inputBuffer.length > 250 * 1024; // > 250KB

    // If it's already small and within dimensions, return as is
    if (!needsResize && !isLarge && mimeType === 'image/jpeg') {
      return attachment;
    }

    let pipeline = sharp(inputBuffer);
    if (needsResize) {
      pipeline = pipeline.resize(maxDim, maxDim, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert to high quality JPEG with optimal chroma subsampling for text readability
    const outputBuffer = await pipeline
      .jpeg({
        quality: 85,
        chromaSubsampling: '4:4:4' // preserves crisp sharp text on screenshots
      })
      .toBuffer();

    const newBase64 = outputBuffer.toString('base64');
    const newUrl = `data:image/jpeg;base64,${newBase64}`;

    return {
      ...attachment,
      url: newUrl,
      type: 'image/jpeg',
      size: outputBuffer.length
    };
  } catch (err: any) {
    console.warn('[Image Optimizer] Failed to optimize image, using original:', err.message);
    return attachment;
  }
}
