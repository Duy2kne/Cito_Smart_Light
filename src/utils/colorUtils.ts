/**
 * Tính toán màu sắc RGB mô phỏng hiển thị trên quang học đèn
 * Dựa trên các kênh R, G, B, CW (Trắng lạnh) và Độ sáng tổng (tất cả là số nguyên 0-100)
 */
export function getFixtureColorCSS(
  r: number,
  g: number,
  b: number,
  cw: number,
  bri: number,
  power: number
): {
  cssColor: string;
  cssGlow: string;
  hex: string;
  intensityPercent: number;
} {
  if (power === 0 || bri === 0) {
    return {
      cssColor: 'rgba(30, 30, 35, 0.4)',
      cssGlow: 'none',
      hex: '#000000',
      intensityPercent: 0,
    };
  }

  const briFactor = bri / 100;
  const cwFactor = cw / 100;

  // Thành phần màu trắng lạnh (~6500K: ánh xanh băng 220, 240, 255)
  const cwR = cwFactor * 220;
  const cwG = cwFactor * 240;
  const cwB = cwFactor * 255;

  // Tọa độ màu RGB (thang 0-255)
  const baseR = (r / 100) * 255;
  const baseG = (g / 100) * 255;
  const baseB = (b / 100) * 255;

  // Pha trộn phụ gia RGB + CW
  const rawR = Math.min(255, Math.round(baseR + cwR));
  const rawG = Math.min(255, Math.round(baseG + cwG));
  const rawB = Math.min(255, Math.round(baseB + cwB));

  // Áp dụng độ sáng
  const dispR = Math.min(255, Math.round(rawR * briFactor));
  const dispG = Math.min(255, Math.round(rawG * briFactor));
  const dispB = Math.min(255, Math.round(rawB * briFactor));

  const hexR = dispR.toString(16).padStart(2, '0');
  const hexG = dispG.toString(16).padStart(2, '0');
  const hexB = dispB.toString(16).padStart(2, '0');
  const hex = `#${hexR}${hexG}${hexB}`;

  const cssColor = `rgb(${dispR}, ${dispG}, ${dispB})`;
  const glowAlpha = Math.max(0.15, (bri / 100) * 0.7);
  const cssGlow = `0 0 35px rgba(${dispR}, ${dispG}, ${dispB}, ${glowAlpha}), 0 0 70px rgba(${dispR}, ${dispG}, ${dispB}, ${glowAlpha * 0.5})`;

  const totalRawSum = (r + g + b + cw) / 4;
  const intensityPercent = Math.round(totalRawSum * (bri / 100));

  return {
    cssColor,
    cssGlow,
    hex,
    intensityPercent,
  };
}

/**
 * Lấy mã màu Hex trực tiếp từ các kênh R, G, B, CW
 */
export function getChannelHex(r: number, g: number, b: number, cw: number = 0): string {
  const cwFactor = cw / 100;
  const cwR = cwFactor * 220;
  const cwG = cwFactor * 240;
  const cwB = cwFactor * 255;

  const baseR = (r / 100) * 255;
  const baseG = (g / 100) * 255;
  const baseB = (b / 100) * 255;

  const rawR = Math.min(255, Math.round(baseR + cwR));
  const rawG = Math.min(255, Math.round(baseG + cwG));
  const rawB = Math.min(255, Math.round(baseB + cwB));

  const hexR = rawR.toString(16).padStart(2, '0');
  const hexG = rawG.toString(16).padStart(2, '0');
  const hexB = rawB.toString(16).padStart(2, '0');
  return `#${hexR}${hexG}${hexB}`.toUpperCase();
}

/**
 * Chuyển đổi góc quang phổ Hue (0 - 360 độ) sang R, G, B (%)
 */
export function hueToRgbPercent(hue: number): { r: number; g: number; b: number } {
  const h = ((hue % 360) + 360) % 360 / 60;
  const c = 1;
  const x = c * (1 - Math.abs((h % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (h >= 0 && h < 1) { r1 = c; g1 = x; b1 = 0; }
  else if (h >= 1 && h < 2) { r1 = x; g1 = c; b1 = 0; }
  else if (h >= 2 && h < 3) { r1 = 0; g1 = c; b1 = x; }
  else if (h >= 3 && h < 4) { r1 = 0; g1 = x; b1 = c; }
  else if (h >= 4 && h < 5) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }
  return {
    r: Math.round(r1 * 100),
    g: Math.round(g1 * 100),
    b: Math.round(b1 * 100),
  };
}

/**
 * Chuyển mã màu Hex sang phần trăm số nguyên R, G, B
 */
export function hexToRgbPercent(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 100, g: 100, b: 100 };

  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  return {
    r: Math.round((r / 255) * 100),
    g: Math.round((g / 255) * 100),
    b: Math.round((b / 255) * 100),
  };
}
