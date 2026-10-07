/** Downscale any image blob/file to a JPEG data URL (keeps drafts small). */
export async function blobToDataUrl(blob: Blob, maxSide = 1800, quality = 0.86): Promise<string> {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k);
  const h = Math.round(bmp.height * k);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return c.toDataURL('image/jpeg', quality);
}
