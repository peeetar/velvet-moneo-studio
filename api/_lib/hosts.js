// Image hosts the /api/img proxy may fetch from (exact host or subdomain).
const ALLOWED = ['images.pexels.com', 'pixabay.com', 'cdn.pixabay.com', 'staticflickr.com', 'upload.wikimedia.org', 'rawpixel.com', 'api.openverse.org'];

export function hostAllowed(hostname) {
  return ALLOWED.some((h) => hostname === h || hostname.endsWith('.' + h));
}
