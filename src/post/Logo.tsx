import { LOGOS, type LogoVariant } from '../brand/logo';

/** Brand lockup, recolored with `color`. `h` = height in post pixels. */
export function Logo({ color, h = 76, variant = 'en-hor' }: { color: string; h?: number; variant?: LogoVariant }) {
  const svg = LOGOS[variant] ?? LOGOS['en-hor'];
  return (
    <div
      className="vm-logo"
      style={{ color, height: h, display: 'flex', flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', `<svg style="height:${h}px;width:auto;display:block" `) }}
    />
  );
}
