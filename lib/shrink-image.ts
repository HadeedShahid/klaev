// Runs in the browser before a receipt uploads. A full-screen screenshot from a laptop can pass the
// store's 10 MB limit, and a receipt only has to be readable, so big photos are redrawn smaller as a
// JPEG. Anything the browser can't draw (HEIC, a PDF) goes as it is, and the server checks its size.
const SHRINK_ABOVE = 4 * 1024 * 1024;
const LONGEST_SIDE = 2560;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function shrinkImage(file: File): Promise<File> {
  if (file.size <= SHRINK_ABOVE || !/^image\/(png|jpeg|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, LONGEST_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d")!;
    // JPEG has no transparency: a see-through screenshot lands on white, not black.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
