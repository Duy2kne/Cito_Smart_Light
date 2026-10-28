export interface LedState {
  power: number; // 0 hoặc 1
  r: number; // 0 - 100 (%) số nguyên
  g: number; // 0 - 100 (%) số nguyên
  b: number; // 0 - 100 (%) số nguyên
  cw: number; // 0 - 100 (%) số nguyên
  bri: number; // 0 - 100 (%) số nguyên
  fade?: number; // milliseconds
  gamma?: number; // 0 hoặc 1
  tempC?: number; // Nhiệt độ tản nhiệt (°C)
  fanDuty?: number; // Công suất quạt (0 - 100 %)
  tvalid?: number; // 0 = Chưa có giờ chuẩn, 1 = Đã có giờ chuẩn
  now?: string; // Giờ hiện tại của đèn, ví dụ "13:42:10" hoặc "--:--:--"
}

export type ConnectionStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'reconnecting'
  | 'error';

export interface BleLogEntry {
  id: string;
  timestamp: string;
  type: 'tx' | 'rx' | 'info' | 'error';
  message: string;
}

export type ThemeMode = 'system' | 'light' | 'dark';

// Cấu trúc slot hẹn giờ
export interface ScheduleSlot {
  idx: number; // 0 - 5
  en: number; // 0 hoặc 1
  h: number; // 0 - 23
  m: number; // 0 - 59
  days: number; // Bitmask: bit0=CN, bit1=T2, bit2=T3, bit3=T4, bit4=T5, bit5=T6, bit6=T7 (127=Tất cả)
  act: number; // 1=Bật, 0=Tắt
  scene: number; // 1=Áp dụng màu & độ sáng, 0=Chỉ bật/tắt
  r: number; // 0 - 100
  g: number; // 0 - 100
  b: number; // 0 - 100
  cw: number; // 0 - 100
  bri: number; // 0 - 100
}

export interface ScheduleData {
  enabled: number; // 0 hoặc 1
  tz: number; // Múi giờ phút (e.g. 420 cho UTC+7)
  count: number; // Số lượng slot (thường là 6)
  items: number[][]; // [en, h, m, days, act, scene, r, g, b, cw, bri][]
}

// Cấu trúc Wi-Fi
export type RawWifiNetwork = [string, number, number]; // [ssid, rssi, secured]

export interface WifiStatus {
  scanning: number; // 1 khi đang quét, 0 khi xong
  savedSsid?: string;
  connected: number; // 1 khi đã kết nối Wi-Fi, 0 khi chưa
  ip?: string;
  networks?: RawWifiNetwork[];
}
