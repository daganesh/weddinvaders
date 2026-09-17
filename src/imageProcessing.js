// Channel value (0-255) above which a pixel counts as "white" background.
const WHITE_THRESHOLD = 235;

// Reads an uploaded image file and returns a data URL ready to store in a
// customization package's `images` field. SVGs are passed through verbatim
// (they're already vector with their own transparency — rasterizing one
// through the PNG pipeline below would throw away the whole point of
// uploading a vector icon). Every other image type goes through
// fileToProcessedPngDataUrl()'s chroma-key background removal.
export function fileToImageDataUrl(file) {
  const isSvg = file.type === 'image/svg+xml' || file.name?.toLowerCase().endsWith('.svg');
  return isSvg ? fileToRawDataUrl(file) : fileToProcessedPngDataUrl(file);
}

function fileToRawDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// Reads an uploaded raster image file, re-encodes it as PNG, and makes
// near-white background pixels transparent. Runs entirely client-side via
// canvas — a simple threshold-based chroma key, not true subject/background
// separation, so a genuinely white shirt or dress can also get faded out.
export function fileToProcessedPngDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const minChannel = Math.min(data[i], data[i + 1], data[i + 2]);
          if (minChannel >= WHITE_THRESHOLD) {
            // Feather the edge instead of a hard cutoff: fade alpha in
            // proportion to how close to pure white the pixel is.
            const whiteness = (minChannel - WHITE_THRESHOLD) / (255 - WHITE_THRESHOLD);
            data[i + 3] = Math.round(data[i + 3] * (1 - whiteness));
          }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
