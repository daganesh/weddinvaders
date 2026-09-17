// Channel value (0-255) above which a pixel counts as "white" background.
const WHITE_THRESHOLD = 235;

// In-game, these images are only ever drawn at small sizes (player sprites
// ~62x50px, the largest use — the win-screen couple portrait — ~320px wide).
// Capping the longest edge here keeps a phone photo (easily 3000px+,
// several MB once re-encoded losslessly as PNG below) from bloating
// localStorage — especially once a package with real photos gets copied
// into another package, roughly doubling that usage.
const MAX_DIMENSION = 480;

// Reads an uploaded image file, downscales it, re-encodes it as PNG, and
// makes near-white background pixels transparent. Runs entirely client-side
// via canvas — a simple threshold-based chroma key, not true subject/
// background separation, so a genuinely white shirt or dress can also get
// faded out.
export function fileToProcessedPngDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image'));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.round(img.naturalWidth * scale);
        const height = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

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
