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

// ==========================================
// NHIỀU ĐÈN QUA ESP-NOW (firmware CitoLedMesh, characteristic MESH …0006)
// Firmware cũ CitoLedSmart không có characteristic này -> meshSupported = false
// ==========================================

// Trạng thái xác nhận lệnh gần nhất của một đèn
export type MeshAck = 0 | 1 | 2 | 3; // 0 = chưa gửi, 1 = đã xác nhận, 2 = đang chờ, 3 = không trả lời

export interface MeshLamp {
  id: string; // 6 ký tự cuối MAC, ví dụ "A1B2C3"
  name: string; // Tên gợi nhớ (có thể rỗng)
  group: number; // 0 = chưa vào nhóm, 1..8
  online: number; // 0 / 1
  power: number;
  r: number;
  g: number;
  b: number;
  cw: number;
  bri: number;
  tempC: number | null;
  rssi: number; // dBm, 0 = không rõ
  ack: MeshAck;
  isGateway: number; // 1 = đèn đang kết nối BLE với điện thoại
  hops: number; // 0 = nghe trực tiếp, 1 = qua đèn chuyển tiếp
  tvalid: number;
  fw: number;
  fanDuty: number;
  ackAt?: number; // Date.now() lúc ack chuyển sang 1 (để ẩn dấu ✓ sau vài giây)
}

// Phần tổng quan khi READ characteristic MESH (thông tin của đèn cổng)
export interface MeshInfo {
  v: number;
  self: string;
  name: string;
  grp: number;
  net: number;
  ch: number;
  relay: number;
  irf: number;
  mode: string;
  total: number;
  online: number;
}

// Đích điều khiển hiện tại
export type ControlTarget =
  | { kind: 'self' } // chỉ đèn đang kết nối - đi đường RX như firmware cũ
  | { kind: 'all' }
  | { kind: 'group'; group: number }
  | { kind: 'lamps'; ids: string[] };
