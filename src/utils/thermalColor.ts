/**
 * Maps a temperature in Celsius to a smooth scientific color gradient:
 * Cold (<= 0°C): Cyan (#0284c7)
 * Cool (~25°C): Teal/Sky (#0d9488)
 * Moderate (~50°C): Emerald (#10b981)
 * Warm (~75°C): Amber (#f59e0b)
 * Hot (>= 100°C): Crimson (#dc2626)
 */
export function tempToRgb(tempC: number, minC = 0, maxC = 100): [number, number, number] {
  const t = Math.max(0, Math.min(1, (tempC - minC) / (maxC - minC)));
  const stops: Array<{ p: number; rgb: [number, number, number] }> = [
    { p: 0.0, rgb: [2, 132, 199] },   // sky-600 / cyan
    { p: 0.32, rgb: [5, 150, 105] },  // emerald-600 (deeper contrast)
    { p: 0.66, rgb: [217, 119, 6] },  // amber-600 (deeper contrast)
    { p: 1.0, rgb: [220, 38, 38] },   // red-600 / crimson
  ];

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.p && t <= b.p) {
      const local = (t - a.p) / (b.p - a.p);
      return [
        Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * local),
        Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * local),
        Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * local),
      ];
    }
  }
  return stops[stops.length - 1].rgb;
}

export function tempToColor(tempC: number, minC = 0, maxC = 100, alpha = 1): string {
  const [r, g, b] = tempToRgb(tempC, minC, maxC);
  return alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Deeper darkened color variant guaranteed to stay ultra-legible on white/light backgrounds.
 */
export function tempToDarkTextColor(tempC: number, minC = 0, maxC = 100): string {
  const [r, g, b] = tempToRgb(tempC, minC, maxC);
  const dr = Math.round(r * 0.72);
  const dg = Math.round(g * 0.72);
  const db = Math.round(b * 0.72);
  return `rgb(${dr}, ${dg}, ${db})`;
}

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function celsiusToKelvin(c: number): number {
  return c + 273.15;
}

export function celsiusToCustom(c: number, xIce: number, xSteam: number): number {
  return xIce + ((xSteam - xIce) * c) / 100;
}

export function faultyToTrueCelsius(xReading: number, xIce: number, xSteam: number): number {
  const interval = xSteam - xIce;
  if (Math.abs(interval) < 0.0001) return 0;
  return ((xReading - xIce) / interval) * 100;
}

/**
 * Returns the unique temperature where X_faulty = C_true, or null if lines are parallel or identical.
 * Solving X = 100*(X - X_ice)/(X_steam - X_ice)
 * => X * (interval - 100) = -100 * X_ice
 * => X = (100 * X_ice) / (100 - interval)
 */
export function getFaultyCoincidence(
  xIce: number,
  xSteam: number
): { status: 'unique'; value: number } | { status: 'identical' } | { status: 'none' } {
  const interval = xSteam - xIce;
  if (Math.abs(interval - 100) < 0.0001) {
    if (Math.abs(xIce) < 0.0001) {
      return { status: 'identical' };
    }
    return { status: 'none' };
  }
  const value = (100 * xIce) / (100 - interval);
  return { status: 'unique', value };
}

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Draws a crisp, high-contrast canvas label inside a solid white backing tag so dashed/solid
 * reference lines never cut through digits or text.
 */
export function drawCrispLabelBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    align?: 'left' | 'right' | 'center';
    textColor?: string;
    borderColor?: string;
    bgColor?: string;
    font?: string;
    padX?: number;
    height?: number;
  } = {}
) {
  const {
    align = 'left',
    textColor = '#020617',
    borderColor = 'rgba(148, 163, 184, 0.7)',
    bgColor = 'rgba(255, 255, 255, 0.96)',
    font = '700 11.5px "JetBrains Mono", monospace',
    padX = 6,
    height = 19,
  } = options;

  ctx.save();
  ctx.font = font;
  const textW = ctx.measureText(text).width;
  const boxW = textW + padX * 2;
  let boxX = x;
  if (align === 'right') boxX = x - boxW;
  else if (align === 'center') boxX = x - boxW / 2;
  const boxY = y - height / 2;

  drawRoundedRect(ctx, boxX, boxY, boxW, height, 5);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.1;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, boxX + boxW / 2, y + 0.5);
  ctx.restore();
}
