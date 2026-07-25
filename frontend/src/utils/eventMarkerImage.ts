const OUTPUT_SIZE = 128;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 256 * 1024;
const SUPPORTED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function dataUrlBytes(dataUrl: string) {
  const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((encoded.length * 3) / 4);
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Не удалось прочитать изображение."));
    };
    image.src = objectUrl;
  });
}

function imageHasTransparency(image: HTMLImageElement) {
  const sample = document.createElement("canvas");
  sample.width = 32;
  sample.height = 32;
  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) return true;
  context.drawImage(image, 0, 0, sample.width, sample.height);
  const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] < 250) return true;
  }
  return false;
}

export async function prepareEventMarkerImage(file: File) {
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error("Выберите PNG, JPEG, GIF или WebP.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Исходное изображение не должно превышать 10 МБ.");
  }

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Браузер не поддерживает обработку изображения.");

  context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.save();
  context.beginPath();
  context.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
  context.clip();

  const scaleForWidth = OUTPUT_SIZE / image.naturalWidth;
  const scaleForHeight = OUTPUT_SIZE / image.naturalHeight;
  const scale = imageHasTransparency(image)
    ? Math.min(scaleForWidth, scaleForHeight)
    : Math.max(scaleForWidth, scaleForHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, (OUTPUT_SIZE - width) / 2, (OUTPUT_SIZE - height) / 2, width, height);
  context.restore();

  const dataUrl = canvas.toDataURL("image/png");
  if (dataUrlBytes(dataUrl) > MAX_OUTPUT_BYTES) {
    throw new Error("Изображение получилось слишком большим. Попробуйте другой файл.");
  }

  return dataUrl;
}
