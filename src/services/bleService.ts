import {
  LedState,
  ConnectionStatus,
  BleLogEntry,
  ScheduleData,
  ScheduleSlot,
  WifiStatus,
  MeshLamp,
  MeshInfo,
  MeshAck,
  ControlTarget,
} from '../types';
import { sanitizeLampName, targetIncludesLamp } from '../utils/meshUtils';

export const CITO_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const CITO_WRITE_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const CITO_NOTIFY_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
export const CITO_SCHED_CHAR_UUID = '6e400004-b5a3-f393-e0a9-e50e24dcca9e';
export const CITO_WIFI_CHAR_UUID = '6e400005-b5a3-f393-e0a9-e50e24dcca9e';
// Chỉ có ở firmware CitoLedMesh - điều khiển nhiều đèn qua ESP-NOW
export const CITO_MESH_CHAR_UUID = '6e400006-b5a3-f393-e0a9-e50e24dcca9e';
export const CITO_DEVICE_NAME = 'CitoLedSmart';

// Firmware giới hạn mỗi lệnh ESP-NOW ~235 byte
const MESH_MAX_CMD_BYTES = 230;
const MESH_POLL_MS = 15000;

type StatusCallback = (state: Partial<LedState>) => void;
type ConnectionCallback = (status: ConnectionStatus, errorMsg?: string) => void;
type LogCallback = (log: BleLogEntry) => void;
type ScheduleCallback = (data: ScheduleData) => void;
type WifiCallback = (status: WifiStatus) => void;
type MeshCallback = (supported: boolean, info: MeshInfo | null, lamps: MeshLamp[]) => void;

export class BleService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private notifyCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private schedCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private wifiCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private meshCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

  private onStatusCallback: StatusCallback | null = null;
  private onConnectionCallback: ConnectionCallback | null = null;
  private onLogCallback: LogCallback | null = null;
  private onScheduleCallback: ScheduleCallback | null = null;
  private onWifiCallback: WifiCallback | null = null;
  private onMeshCallback: MeshCallback | null = null;

  // --- Nhiều đèn (MESH) ---
  public meshSupported: boolean = false;
  private meshInfo: MeshInfo | null = null;
  private meshLamps: Map<string, MeshLamp> = new Map();
  private meshRxBuffer: string = '';
  private meshPollTimer: number | null = null;
  private meshReading: boolean = false;
  private target: ControlTarget = { kind: 'self' };
  private mockLegacy: boolean = false;

  private rxBuffer: string = '';
  private writeQueue: Promise<void> = Promise.resolve();
  private lastSentState: Partial<LedState> = {};
  private pendingChanges: Partial<LedState> = {};
  private debounceTimer: number | null = null;
  private wifiPollTimer: number | null = null;
  private lastTimeSyncAttempt: number = 0;

  public isMockMode: boolean = false;
  private mockState: LedState = {
    power: 1,
    r: 80,
    g: 50,
    b: 10,
    cw: 0,
    bri: 100,
    fade: 400,
    gamma: 1,
    tempC: 34,
    fanDuty: 15,
    tvalid: 0,
    now: '--:--:--',
  };

  private mockSchedule: ScheduleData = {
    enabled: 1,
    tz: 420,
    count: 6,
    items: [
      [1, 6, 30, 127, 1, 1, 30, 20, 10, 80, 50], // Sáng sớm
      [1, 11, 0, 127, 1, 1, 90, 60, 20, 0, 100], // Buổi trưa
      [1, 18, 0, 127, 1, 1, 100, 30, 10, 0, 80], // Buổi chiều
      [1, 21, 30, 127, 1, 1, 10, 0, 80, 0, 20], // Ban đêm
      [1, 23, 0, 127, 0, 0, 0, 0, 0, 0, 0], // Tắt đèn đêm
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Slot trống
    ],
  };

  private mockWifi: WifiStatus = {
    scanning: 0,
    savedSsid: 'Cito_Aquarium_2.4G',
    connected: 1,
    ip: '192.168.1.155',
    networks: [
      ['Cito_Aquarium_2.4G', -42, 1],
      ['Home_LivingRoom_5G', -58, 1],
      ['Coffee_Free_WiFi', -76, 0],
      ['Neighbor_WiFi_Ext', -84, 1],
    ],
  };

  private mockInterval: number | null = null;

  constructor() {
    if (typeof navigator !== 'undefined' && !navigator.bluetooth) {
      this.log('info', 'Trình duyệt hiện tại chưa hỗ trợ trực tiếp Web Bluetooth API.');
    }
  }

  public setCallbacks(
    onStatus: StatusCallback,
    onConnection: ConnectionCallback,
    onLog: LogCallback,
    onSchedule?: ScheduleCallback,
    onWifi?: WifiCallback
  ) {
    this.onStatusCallback = onStatus;
    this.onConnectionCallback = onConnection;
    this.onLogCallback = onLog;
    if (onSchedule) this.onScheduleCallback = onSchedule;
    if (onWifi) this.onWifiCallback = onWifi;
  }

  public setMeshCallback(onMesh: MeshCallback) {
    this.onMeshCallback = onMesh;
  }

  public isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);
  }

  private log(type: 'tx' | 'rx' | 'info' | 'error', message: string) {
    const entry: BleLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      type,
      message,
    };
    if (this.onLogCallback) {
      this.onLogCallback(entry);
    }
  }

  public async connect(scanAllDevices: boolean = true): Promise<void> {
    if (this.isMockMode) {
      this.connectMock();
      return;
    }

    if (!this.isBluetoothSupported()) {
      const err = 'Trình duyệt không hỗ trợ Web Bluetooth. Vui lòng dùng Google Chrome/Edge (Android/Máy tính) hoặc Bluefy (trên iPhone/iPad).';
      this.log('error', err);
      this.onConnectionCallback?.('error', err);
      return;
    }

    try {
      this.onConnectionCallback?.('scanning');
      
      const allOptionalServices = [
        CITO_SERVICE_UUID,
        CITO_WRITE_CHAR_UUID,
        CITO_NOTIFY_CHAR_UUID,
        CITO_SCHED_CHAR_UUID,
        CITO_WIFI_CHAR_UUID,
        CITO_MESH_CHAR_UUID,
        '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
        '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute
        '0000180a-0000-1000-8000-00805f9b34fb', // Device Info
        '0000ffe0-0000-1000-8000-00805f9b34fb', // Common BLE UART
        '0000fff0-0000-1000-8000-00805f9b34fb', // Common Smart LED
      ];

      let device: BluetoothDevice;

      if (scanAllDevices) {
        this.log('info', 'Đang mở hộp thoại quét TẤT CẢ thiết bị Bluetooth xung quanh...');
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: allOptionalServices,
        });
      } else {
        this.log('info', `Đang tìm thiết bị với tên "${CITO_DEVICE_NAME}" hoặc tiền tố "Cito"...`);
        device = await navigator.bluetooth.requestDevice({
          filters: [
            { name: CITO_DEVICE_NAME },
            { namePrefix: 'Cito' },
            { services: [CITO_SERVICE_UUID] },
          ],
          optionalServices: allOptionalServices,
        });
      }

      this.device = device;
      this.log('info', `Đã chọn thiết bị: ${device.name || 'Thiết bị không tên'} (ID: ${device.id})`);

      device.addEventListener('gattserverdisconnected', this.handleDisconnection);

      this.onConnectionCallback?.('connecting');
      this.log('info', 'Đang kết nối GATT Server...');

      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('Không thể kết nối GATT server.');
      }
      this.server = server;
      this.log('info', 'GATT Server đã kết nối thành công. Đang kiểm tra Cito Service...');

      let service: BluetoothRemoteGATTService | null = null;
      try {
        service = await server.getPrimaryService(CITO_SERVICE_UUID);
        this.log('info', 'Đã tìm thấy Cito Service.');
      } catch (servErr: any) {
        // Thử tìm trong danh sách các dịch vụ nếu có
        try {
          const services = await server.getPrimaryServices();
          if (services && services.length > 0) {
            service = services.find(s => s.uuid.toLowerCase() === CITO_SERVICE_UUID.toLowerCase()) || services[0];
            this.log('info', `Đã kết nối dịch vụ: ${service.uuid}`);
          }
        } catch (e) {
          // ignore fallback
        }
        if (!service) {
          throw new Error(`Thiết bị "${device.name || 'đã chọn'}" không hỗ trợ Cito Service. Vui lòng chọn đúng đèn Cito Smart Light!`);
        }
      }

      // 1. Write characteristic (Control)
      try {
        this.writeCharacteristic = await service.getCharacteristic(CITO_WRITE_CHAR_UUID);
        this.log('info', 'Đã sẵn sàng kênh điều khiển (WRITE).');
      } catch (e: any) {
        this.log('error', `Lỗi nhận diện Write Char: ${e.message}`);
      }

      // 2. Notify characteristic (Status)
      try {
        this.notifyCharacteristic = await service.getCharacteristic(CITO_NOTIFY_CHAR_UUID);
        await this.notifyCharacteristic.startNotifications();
        this.notifyCharacteristic.addEventListener(
          'characteristicvaluechanged',
          this.handleNotification
        );
        this.log('info', 'Đã kích hoạt kênh nhận trạng thái (NOTIFY).');
      } catch (e: any) {
        this.log('error', `Lỗi kích hoạt Notify Char: ${e.message}`);
      }

      // 3. Sched characteristic (Schedule)
      try {
        this.schedCharacteristic = await service.getCharacteristic(CITO_SCHED_CHAR_UUID);
        this.log('info', 'Đã sẵn sàng kênh Hẹn giờ (SCHED).');
        // Đọc lịch trình ban đầu
        this.readSchedule();
      } catch (e: any) {
        this.log('info', `Kênh SCHED không khả dụng: ${e.message}`);
      }

      // 4. Wifi characteristic (Wi-Fi)
      try {
        this.wifiCharacteristic = await service.getCharacteristic(CITO_WIFI_CHAR_UUID);
        this.log('info', 'Đã sẵn sàng kênh Quản lý Wi-Fi (WIFI).');
        // Đọc trạng thái Wi-Fi ban đầu
        this.readWifiStatus();
      } catch (e: any) {
        this.log('info', `Kênh WIFI không khả dụng: ${e.message}`);
      }

      // 5. Mesh characteristic (nhiều đèn) - CHỈ có ở firmware CitoLedMesh.
      //    Firmware cũ không có -> giữ nguyên hành vi một đèn, không báo lỗi.
      try {
        const meshChar = await service.getCharacteristic(CITO_MESH_CHAR_UUID);
        await meshChar.startNotifications();
        meshChar.addEventListener('characteristicvaluechanged', this.handleMeshNotification);
        this.meshCharacteristic = meshChar;
        this.meshSupported = true;
        this.log('info', 'Đèn hỗ trợ điều khiển nhiều đèn (MESH).');
      } catch {
        this.meshCharacteristic = null;
        this.meshSupported = false;
        this.log('info', 'Firmware đèn không có kênh MESH - chỉ điều khiển riêng đèn này.');
      }
      this.emitMesh();

      this.onConnectionCallback?.('connected');
      this.log('info', 'Kết nối thành công với Cito Smart Light!');

      if (this.meshSupported) {
        setTimeout(() => {
          this.readMeshList();
        }, 700);
        if (this.meshPollTimer) clearInterval(this.meshPollTimer);
        this.meshPollTimer = window.setInterval(() => {
          this.readMeshList();
        }, MESH_POLL_MS);
      }

      // Tự động đồng bộ thời gian từ điện thoại xuống đèn ngay sau khi kết nối
      setTimeout(() => {
        this.syncDeviceTime(true);
      }, 350);
    } catch (err: any) {
      if (err.name === 'NotFoundError' || (typeof err.message === 'string' && err.message.toLowerCase().includes('cancel'))) {
        this.log('info', 'Đã hủy quét thiết bị.');
        this.onConnectionCallback?.('idle');
        return;
      }
      this.log('error', `Kết nối thất bại: ${err.message || err}`);
      this.onConnectionCallback?.('error', err.message || 'Kết nối thất bại');
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isMockMode) {
      this.disconnectMock();
      return;
    }

    this.onConnectionCallback?.('disconnecting');
    this.log('info', 'Đang ngắt kết nối...');

    try {
      if (this.wifiPollTimer) {
        clearInterval(this.wifiPollTimer);
        this.wifiPollTimer = null;
      }

      if (this.notifyCharacteristic) {
        try {
          await this.notifyCharacteristic.stopNotifications();
          this.notifyCharacteristic.removeEventListener(
            'characteristicvaluechanged',
            this.handleNotification
          );
        } catch {
          // ignore
        }
      }

      if (this.meshCharacteristic) {
        try {
          await this.meshCharacteristic.stopNotifications();
          this.meshCharacteristic.removeEventListener(
            'characteristicvaluechanged',
            this.handleMeshNotification
          );
        } catch {
          // ignore
        }
      }

      if (this.device && this.device.gatt?.connected) {
        this.device.gatt.disconnect();
      }
    } catch (err: any) {
      this.log('error', `Lỗi khi ngắt kết nối: ${err.message}`);
    } finally {
      this.cleanup();
      this.onConnectionCallback?.('idle');
      this.log('info', 'Đã ngắt kết nối.');
    }
  }

  private handleDisconnection = () => {
    this.log('info', 'Thiết bị ngắt kết nối.');
    this.cleanup();
    this.onConnectionCallback?.('idle', 'Thiết bị đã ngắt kết nối.');
  };

  private cleanup() {
    this.device = null;
    this.server = null;
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    this.schedCharacteristic = null;
    this.wifiCharacteristic = null;
    this.rxBuffer = '';
    this.lastSentState = {};
    this.pendingChanges = {};
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.wifiPollTimer) {
      clearInterval(this.wifiPollTimer);
      this.wifiPollTimer = null;
    }
    this.resetMesh();
  }

  private resetMesh() {
    this.meshCharacteristic = null;
    this.meshSupported = false;
    this.meshInfo = null;
    this.meshLamps.clear();
    this.meshRxBuffer = '';
    this.meshReading = false;
    this.target = { kind: 'self' };
    if (this.meshPollTimer) {
      clearInterval(this.meshPollTimer);
      this.meshPollTimer = null;
    }
    this.emitMesh();
  }

  private handleNotification = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;

    const decoder = new TextDecoder('utf-8');
    const chunk = decoder.decode(value);
    this.rxBuffer += chunk;

    this.processRxBuffer();
  };

  private processRxBuffer() {
    const firstOpen = this.rxBuffer.indexOf('{');
    if (firstOpen === -1) {
      if (this.rxBuffer.length > 500) this.rxBuffer = '';
      return;
    }

    if (firstOpen > 0) {
      this.rxBuffer = this.rxBuffer.substring(firstOpen);
    }

    let braceCount = 0;
    let endIndex = -1;

    for (let i = 0; i < this.rxBuffer.length; i++) {
      if (this.rxBuffer[i] === '{') braceCount++;
      else if (this.rxBuffer[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i;
          break;
        }
      }
    }

    if (endIndex !== -1) {
      const jsonStr = this.rxBuffer.substring(0, endIndex + 1);
      this.rxBuffer = this.rxBuffer.substring(endIndex + 1);

      try {
        const parsed = JSON.parse(jsonStr);
        this.log('rx', `RX Trạng thái: ${jsonStr}`);
        if (this.onStatusCallback) {
          this.onStatusCallback(parsed);
        }

        // Tự động phát hiện khi đèn báo chưa có giờ chuẩn (tvalid === 0 hoặc now === '--:--:--')
        if (parsed && (parsed.tvalid === 0 || parsed.now === '--:--:--')) {
          const nowMs = Date.now();
          if (nowMs - this.lastTimeSyncAttempt > 12000) {
            this.log('info', 'Phát hiện đèn chưa có giờ chuẩn (tvalid: 0). Tự động gửi gói epoch & tz từ điện thoại...');
            this.syncDeviceTime(true);
          }
        }
      } catch {
        this.log('error', `Không thể giải mã gói tin JSON: ${jsonStr}`);
      }

      if (this.rxBuffer.includes('{') && this.rxBuffer.includes('}')) {
        this.processRxBuffer();
      }
    }
  }

  /**
   * Gửi các thay đổi kênh màu / độ sáng (số nguyên) qua BLE GATT Write
   */
  public sendChanges(changes: Partial<LedState>, immediate = false): void {
    // Cập nhật ngay danh sách đèn trên màn hình (không chờ đèn báo lại)
    this.applyOptimisticToTargets(changes);

    if (this.isMockMode) {
      if (this.mockTargetsGateway()) this.sendMockChanges(changes);
      if (this.resolveTargetString() !== null) {
        this.log('tx', `[Mô phỏng MESH]: to=${this.resolveTargetString()}&${this.changesToQuery(changes)}`);
        this.simulateMockAcks();
      }
      return;
    }

    let hasActualDiff = false;
    for (const [key, val] of Object.entries(changes)) {
      const k = key as keyof LedState;
      if (val !== undefined && (this.lastSentState[k] === undefined || this.lastSentState[k] !== val)) {
        (this.pendingChanges as any)[k] = val;
        hasActualDiff = true;
      }
    }

    if (!hasActualDiff && !immediate) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (immediate) {
      this.flushPendingWrites();
    } else {
      this.debounceTimer = window.setTimeout(() => {
        this.flushPendingWrites();
      }, 120);
    }
  }

  private flushPendingWrites(): void {
    if (Object.keys(this.pendingChanges).length === 0) return;

    const deltaToSend = { ...this.pendingChanges };
    this.pendingChanges = {};

    const parts: string[] = [];

    if (deltaToSend.power !== undefined) {
      parts.push(`power=${deltaToSend.power}`);
      this.lastSentState.power = deltaToSend.power;
    }
    if (deltaToSend.r !== undefined) {
      const intVal = Math.round(deltaToSend.r);
      parts.push(`r=${intVal}`);
      this.lastSentState.r = intVal;
    }
    if (deltaToSend.g !== undefined) {
      const intVal = Math.round(deltaToSend.g);
      parts.push(`g=${intVal}`);
      this.lastSentState.g = intVal;
    }
    if (deltaToSend.b !== undefined) {
      const intVal = Math.round(deltaToSend.b);
      parts.push(`b=${intVal}`);
      this.lastSentState.b = intVal;
    }
    if (deltaToSend.cw !== undefined) {
      const intVal = Math.round(deltaToSend.cw);
      parts.push(`cw=${intVal}`);
      this.lastSentState.cw = intVal;
    }
    if (deltaToSend.bri !== undefined) {
      const intVal = Math.round(deltaToSend.bri);
      parts.push(`bri=${intVal}`);
      this.lastSentState.bri = intVal;
    }
    if (deltaToSend.gamma !== undefined) {
      parts.push(`gamma=${deltaToSend.gamma}`);
      this.lastSentState.gamma = deltaToSend.gamma;
    }

    if (parts.length === 0) return;
    const commandText = parts.join('&');

    // Đích là riêng đèn đang kết nối (hoặc firmware cũ) -> đường RX y như cũ.
    // Còn lại -> kênh MESH kèm "to=" để đèn cổng chuyển qua ESP-NOW.
    const to = this.resolveTargetString();
    if (to === null || !this.meshCharacteristic) {
      this.queueWrite(this.writeCharacteristic, commandText);
    } else {
      this.sendMeshTo(to, commandText);
    }
  }

  private changesToQuery(changes: Partial<LedState>): string {
    const parts: string[] = [];
    (['power', 'r', 'g', 'b', 'cw', 'bri', 'gamma'] as const).forEach((k) => {
      const v = changes[k];
      if (v !== undefined) parts.push(`${k}=${Math.round(v)}`);
    });
    return parts.join('&');
  }

  // ==========================================
  // NHIỀU ĐÈN (MESH)
  // ==========================================

  public getTarget(): ControlTarget {
    return this.target;
  }

  /**
   * Đổi đích điều khiển. Gửi nốt thay đổi đang chờ cho đích cũ, rồi xoá
   * lastSentState - nếu không, giá trị trùng lần gửi trước (cho đích khác)
   * sẽ bị bỏ qua, không gửi tới đích mới.
   */
  public setTarget(target: ControlTarget) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
      if (!this.isMockMode) this.flushPendingWrites();
    }
    this.pendingChanges = {};
    this.lastSentState = {};
    this.target = target;
  }

  /** null = chỉ đèn cổng (đi đường RX) */
  private resolveTargetString(): string | null {
    if (!this.meshSupported) return null;
    const t = this.target;
    switch (t.kind) {
      case 'self':
        return null;
      case 'all':
        return 'all';
      case 'group':
        return `g${t.group}`;
      case 'lamps': {
        const ids = t.ids.filter(Boolean);
        const gw = this.meshInfo?.self;
        if (ids.length === 0) return null;
        if (ids.length === 1 && ids[0] === gw) return null;
        return ids.join(',');
      }
    }
  }

  /** Gửi lệnh tới danh sách đích; tách nhỏ nếu chuỗi vượt giới hạn của firmware */
  private sendMeshTo(to: string, body: string) {
    const full = `to=${to}&${body}`;
    if (full.length <= MESH_MAX_CMD_BYTES || !to.includes(',')) {
      this.meshWrite(full);
      return;
    }
    // Chọn đúng toàn bộ đèn online -> gộp thành "all"
    const ids = to.split(',');
    const online = this.getMeshLamps().filter((l) => l.online === 1).map((l) => l.id);
    if (online.length > 0 && online.every((id) => ids.includes(id))) {
      this.meshWrite(`to=all&${body}`);
      return;
    }
    let chunk: string[] = [];
    const flush = () => {
      if (chunk.length) this.meshWrite(`to=${chunk.join(',')}&${body}`);
      chunk = [];
    };
    ids.forEach((id) => {
      const next = `to=${[...chunk, id].join(',')}&${body}`;
      if (next.length > MESH_MAX_CMD_BYTES) flush();
      chunk.push(id);
    });
    flush();
  }

  private meshWrite(cmd: string, silent = false): Promise<void> {
    if (this.isMockMode) {
      if (!silent) this.log('tx', `[Mô phỏng MESH]: ${cmd}`);
      this.applyMockMeshCommand(cmd);
      return Promise.resolve();
    }
    if (!this.meshCharacteristic) {
      this.log('error', 'Kênh MESH chưa sẵn sàng (đèn dùng firmware cũ hoặc chưa kết nối).');
      return Promise.resolve();
    }
    return this.queueWrite(this.meshCharacteristic, cmd, silent);
  }

  public getMeshLamps(): MeshLamp[] {
    const all = Array.from(this.meshLamps.values());
    return [...all.filter((l) => l.isGateway === 1), ...all.filter((l) => l.isGateway !== 1)];
  }

  private emitMesh() {
    this.onMeshCallback?.(this.meshSupported, this.meshInfo ? { ...this.meshInfo } : null, this.getMeshLamps());
  }

  private parseMeshLamp(a: unknown): MeshLamp | null {
    if (!Array.isArray(a) || a.length < 14 || typeof a[0] !== 'string') return null;
    const n = (i: number, d = 0): number => (typeof a[i] === 'number' ? (a[i] as number) : d);
    const ack = n(12);
    return {
      id: (a[0] as string).toUpperCase(),
      name: typeof a[1] === 'string' ? (a[1] as string) : '',
      group: n(2),
      online: n(3),
      power: n(4),
      r: n(5),
      g: n(6),
      b: n(7),
      cw: n(8),
      bri: n(9),
      tempC: typeof a[10] === 'number' ? (a[10] as number) : null,
      rssi: n(11),
      ack: (ack >= 0 && ack <= 3 ? ack : 0) as MeshAck,
      isGateway: n(13),
      hops: n(14),
      tvalid: n(15),
      fw: n(16, 1),
      fanDuty: n(17),
    };
  }

  private upsertLamp(lamp: MeshLamp) {
    const prev = this.meshLamps.get(lamp.id);
    lamp.ackAt = lamp.ack === 1 ? (prev?.ack === 1 ? prev.ackAt : Date.now()) : undefined;
    this.meshLamps.set(lamp.id, lamp);
  }

  private applyOptimisticToTargets(changes: Partial<LedState>) {
    if (!this.meshSupported || this.meshLamps.size === 0) return;
    const viaMesh = this.resolveTargetString() !== null;
    let touched = false;
    this.meshLamps.forEach((lamp, id) => {
      if (lamp.online !== 1 || !targetIncludesLamp(this.target, lamp)) return;
      const next: MeshLamp = { ...lamp };
      (['power', 'r', 'g', 'b', 'cw', 'bri'] as const).forEach((k) => {
        const v = changes[k];
        if (v !== undefined) next[k] = Math.round(v);
      });
      if (viaMesh && lamp.isGateway !== 1) {
        next.ack = 2;
        next.ackAt = undefined;
      }
      this.meshLamps.set(id, next);
      touched = true;
    });
    if (touched) this.emitMesh();
  }

  /** Đọc đủ danh sách đèn: ghi op=page&page=N rồi READ, lặp hết các trang */
  public async readMeshList(): Promise<void> {
    if (this.isMockMode) {
      this.emitMesh();
      return;
    }
    const ch = this.meshCharacteristic;
    if (!ch || this.meshReading) return;
    this.meshReading = true;
    try {
      const collected: MeshLamp[] = [];
      let page = 0;
      let pages = 1;
      let busyRetry = 0;
      while (page < pages && page < 30) {
        await this.queueWrite(ch, `op=page&page=${page}`, true);
        const text = await this.queueRead(ch);
        if (text === null) return;
        const data = JSON.parse(text);
        if (data.busy) {
          if (++busyRetry > 3) return;
          await new Promise((r) => setTimeout(r, 200));
          continue;
        }
        this.meshInfo = {
          v: Number(data.v) || 1,
          self: String(data.self || '').toUpperCase(),
          name: String(data.name || ''),
          grp: Number(data.grp) || 0,
          net: Number(data.net) || 1,
          ch: Number(data.ch) || 0,
          relay: Number(data.relay) || 0,
          irf: Number(data.irf) || 0,
          mode: String(data.mode || ''),
          total: Number(data.total) || 0,
          online: Number(data.online) || 0,
        };
        pages = Math.max(1, Number(data.pages) || 1);
        if (Array.isArray(data.lamps)) {
          data.lamps.forEach((a: unknown) => {
            const lamp = this.parseMeshLamp(a);
            if (lamp) collected.push(lamp);
          });
        }
        page++;
      }
      if (!this.meshCharacteristic) return; // đã ngắt kết nối giữa chừng
      const fresh = new Map<string, MeshLamp>();
      collected.forEach((l) => {
        const prev = this.meshLamps.get(l.id);
        l.ackAt = l.ack === 1 ? (prev?.ack === 1 ? prev.ackAt : Date.now()) : undefined;
        fresh.set(l.id, l);
      });
      this.meshLamps = fresh;
      this.emitMesh();
    } catch (err: any) {
      this.log('error', `Lỗi đọc danh sách đèn: ${err.message || err}`);
    } finally {
      this.meshReading = false;
    }
  }

  private handleMeshNotification = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) return;
    this.meshRxBuffer += new TextDecoder('utf-8').decode(target.value);

    // Tách từng object JSON hoàn chỉnh (buffer riêng, không lẫn với TX)
    for (;;) {
      const start = this.meshRxBuffer.indexOf('{');
      if (start === -1) {
        if (this.meshRxBuffer.length > 1000) this.meshRxBuffer = '';
        return;
      }
      let depth = 0;
      let end = -1;
      let inStr = false;
      for (let i = start; i < this.meshRxBuffer.length; i++) {
        const c = this.meshRxBuffer[i];
        if (inStr) {
          if (c === '\\') i++;
          else if (c === '"') inStr = false;
        } else if (c === '"') inStr = true;
        else if (c === '{') depth++;
        else if (c === '}' && --depth === 0) {
          end = i;
          break;
        }
      }
      if (end === -1) {
        this.meshRxBuffer = this.meshRxBuffer.substring(start);
        return;
      }
      const jsonStr = this.meshRxBuffer.substring(start, end + 1);
      this.meshRxBuffer = this.meshRxBuffer.substring(end + 1);
      try {
        const parsed = JSON.parse(jsonStr);
        const lamp = this.parseMeshLamp(parsed.lamp);
        if (lamp) {
          this.log('rx', `RX Mesh: ${jsonStr}`);
          this.upsertLamp(lamp);
          if (lamp.isGateway === 1 && this.meshInfo) {
            this.meshInfo = { ...this.meshInfo, name: lamp.name, grp: lamp.group };
          }
          this.emitMesh();
        }
      } catch {
        this.log('error', `Không thể giải mã gói MESH: ${jsonStr}`);
      }
    }
  };

  /** Hỏi lại trạng thái cả mạng rồi đọc lại danh sách */
  public meshPing() {
    this.meshWrite('op=ping');
    if (!this.isMockMode) {
      setTimeout(() => {
        this.readMeshList();
      }, 1500);
    }
  }

  private patchLamp(id: string, patch: Partial<MeshLamp>) {
    const lamp = this.meshLamps.get(id);
    if (!lamp) return;
    this.meshLamps.set(id, { ...lamp, ...patch });
    if (lamp.isGateway === 1 && this.meshInfo) {
      this.meshInfo = {
        ...this.meshInfo,
        name: patch.name ?? this.meshInfo.name,
        grp: patch.group ?? this.meshInfo.grp,
      };
    }
    this.emitMesh();
  }

  public meshRename(id: string, name: string) {
    const clean = sanitizeLampName(name);
    this.meshWrite(`to=${id}&op=cfg&name=${clean}`);
    this.patchLamp(id, { name: clean });
  }

  public meshSetGroup(id: string, group: number) {
    const g = Math.max(0, Math.min(8, Math.round(group)));
    this.meshWrite(`to=${id}&op=cfg&grp=${g}`);
    this.patchLamp(id, { group: g });
  }

  public meshIdentify(id: string) {
    this.meshWrite(`to=${id}&op=ident`);
  }

  /** Bật/tắt chuyển tiếp sóng hoặc "nhóm chạy theo remote" cho cả khu */
  public meshSetAreaOption(key: 'relay' | 'irf', value: 0 | 1) {
    this.meshWrite(`to=all&op=cfg&${key}=${value}`);
    if (this.meshInfo) {
      this.meshInfo = { ...this.meshInfo, [key]: value };
      this.emitMesh();
    }
  }

  /** Đổi mã mạng cả khu - đèn cổng tự đổi SAU CÙNG (firmware lo) */
  public meshSetNet(net: number) {
    const n = Math.max(1, Math.min(255, Math.round(net)));
    this.meshWrite(`to=all&op=cfg&net=${n}`);
    if (this.meshInfo) {
      this.meshInfo = { ...this.meshInfo, net: n };
      this.emitMesh();
    }
  }

  /** Chép toàn bộ lịch (của đèn cổng) sang đích: "all" | "g<N>" | danh sách ID */
  public async meshCopySchedule(to: string, data: ScheduleData): Promise<void> {
    const count = Math.min(data.count || data.items.length, data.items.length);
    this.log('info', `Đang chép ${count} mốc hẹn giờ sang "${to}"...`);
    for (let idx = 0; idx < count; idx++) {
      const [en, h, m, days, act, scene, r, g, b, cw, bri] = data.items[idx];
      await this.meshWrite(
        `to=${to}&op=sched&idx=${idx}&en=${en}&h=${h}&m=${m}&days=${days}&act=${act}&scene=${scene}` +
          `&r=${Math.round(r)}&g=${Math.round(g)}&b=${Math.round(b)}&cw=${Math.round(cw)}&bri=${Math.round(bri)}`
      );
      await new Promise((res) => setTimeout(res, 80)); // để đèn cổng kịp xếp hàng
    }
    await this.meshWrite(`to=${to}&op=sched&on=${data.enabled ? 1 : 0}`);
    this.log('info', `Đã gửi lịch hẹn giờ sang "${to}".`);
  }

  /**
   * Đồng bộ thời gian thực từ điện thoại xuống đèn:
   * Gửi chuỗi: epoch=<số giây UTC hiện tại>&tz=<múi giờ phút (vd 420 cho UTC+7)>
   * Firmware nhận epoch ở cả 3 characteristic ghi được: WRITE (…0002), SCHED (…0004), WIFI (…0005).
   * Gói chỉ có epoch/tz không làm thay đổi trạng thái đèn và không ghi NVS vô ích.
   */
  public async syncDeviceTime(force: boolean = false): Promise<boolean> {
    const nowMs = Date.now();
    if (!force && nowMs - this.lastTimeSyncAttempt < 10000) {
      return false;
    }
    this.lastTimeSyncAttempt = nowMs;

    const epoch = Math.floor(nowMs / 1000);
    let tz = -new Date().getTimezoneOffset();
    if (isNaN(tz) || tz === 0) {
      tz = 420; // Mặc định múi giờ Việt Nam UTC+7
    }

    const cmd = `epoch=${epoch}&tz=${tz}`;

    if (this.isMockMode) {
      this.log('tx', `[Mô phỏng TX]: ${cmd}`);
      this.parseAndApplyMockCommand(cmd);
      return true;
    }

    const targetChar =
      this.writeCharacteristic || this.schedCharacteristic || this.wifiCharacteristic;

    if (!targetChar) {
      this.log('error', 'Chưa thể đồng bộ thời gian: Đèn chưa kết nối hoặc không có kênh ghi BLE.');
      return false;
    }

    const timeFormatted = new Date().toLocaleTimeString('vi-VN');
    this.log('info', `Đang đồng bộ giờ điện thoại (${timeFormatted}) xuống đèn: ${cmd}...`);
    await this.queueWrite(targetChar, cmd);
    this.log('info', `Đã gửi gói đồng bộ giờ (${timeFormatted}, múi giờ ${tz} phút).`);
    return true;
  }

  public async sendRawCommand(rawText: string): Promise<void> {
    // "mesh: to=all&power=0" -> ghi thẳng vào kênh MESH (để thử nghiệm)
    const meshMatch = rawText.match(/^\s*mesh:\s*(.+)$/i);
    if (meshMatch) {
      return this.meshWrite(meshMatch[1].trim());
    }
    if (this.isMockMode) {
      this.log('tx', `[Mô phỏng TX]: ${rawText}`);
      this.parseAndApplyMockCommand(rawText);
      return;
    }
    return this.queueWrite(this.writeCharacteristic, rawText);
  }

  private queueWrite(
    char: BluetoothRemoteGATTCharacteristic | null,
    commandText: string,
    silent: boolean = false
  ): Promise<void> {
    this.writeQueue = this.writeQueue
      .then(async () => {
        if (!char) {
          this.log('error', `Không thể gửi "${commandText}": Chưa kết nối hoặc kênh không hợp lệ.`);
          return;
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(commandText);

        if (!silent) {
          this.log('tx', `${char === this.meshCharacteristic ? 'TX Mesh' : 'TX'}: ${commandText}`);
        }
        await char.writeValue(data);
      })
      .catch((err) => {
        this.log('error', `Lỗi ghi BLE: ${err.message || err}`);
      });

    return this.writeQueue;
  }

  // Đọc characteristic qua CÙNG hàng đợi với lệnh ghi (tránh "GATT operation already in progress")
  private queueRead(char: BluetoothRemoteGATTCharacteristic): Promise<string | null> {
    const result = this.writeQueue.then(async () => {
      const value = await char.readValue();
      return new TextDecoder('utf-8').decode(value);
    });
    this.writeQueue = result.then(
      () => undefined,
      () => undefined
    );
    return result.catch((err) => {
      this.log('error', `Lỗi đọc BLE: ${err.message || err}`);
      return null;
    });
  }

  // ==========================================
  // LẬP LỊCH HẸN GIỜ (SCHED)
  // ==========================================

  public async readSchedule(): Promise<ScheduleData | null> {
    if (this.isMockMode) {
      if (this.onScheduleCallback) this.onScheduleCallback(this.mockSchedule);
      return this.mockSchedule;
    }

    if (!this.schedCharacteristic) {
      this.log('error', 'Kênh SCHED chưa được kết nối.');
      return null;
    }

    try {
      this.log('info', 'Đang đọc cấu hình lịch hẹn giờ từ thiết bị...');
      const value = await this.schedCharacteristic.readValue();
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(value);
      this.log('rx', `RX Lịch: ${text}`);

      const data: ScheduleData = JSON.parse(text);
      if (this.onScheduleCallback) {
        this.onScheduleCallback(data);
      }
      return data;
    } catch (err: any) {
      this.log('error', `Lỗi đọc lịch: ${err.message || err}`);
      return null;
    }
  }

  public async setScheduleEnabled(enabled: boolean): Promise<void> {
    const cmd = `on=${enabled ? 1 : 0}`;
    if (this.isMockMode) {
      this.mockSchedule.enabled = enabled ? 1 : 0;
      this.log('tx', `[Mô phỏng SCHED]: ${cmd}`);
      if (this.onScheduleCallback) this.onScheduleCallback({ ...this.mockSchedule });
      return;
    }

    if (!this.schedCharacteristic) {
      this.log('error', 'Kênh SCHED chưa được kết nối.');
      return;
    }

    await this.queueWrite(this.schedCharacteristic, cmd);
    // Đọc lại để đồng bộ
    await this.readSchedule();
  }

  public async saveScheduleSlot(slot: ScheduleSlot): Promise<void> {
    const cmd = `idx=${slot.idx}&en=${slot.en}&h=${slot.h}&m=${slot.m}&days=${slot.days}&act=${slot.act}&scene=${slot.scene}&r=${Math.round(slot.r)}&g=${Math.round(slot.g)}&b=${Math.round(slot.b)}&cw=${Math.round(slot.cw)}&bri=${Math.round(slot.bri)}`;

    if (this.isMockMode) {
      this.log('tx', `[Mô phỏng SCHED]: ${cmd}`);
      this.mockSchedule.items[slot.idx] = [
        slot.en,
        slot.h,
        slot.m,
        slot.days,
        slot.act,
        slot.scene,
        Math.round(slot.r),
        Math.round(slot.g),
        Math.round(slot.b),
        Math.round(slot.cw),
        Math.round(slot.bri),
      ];
      if (this.onScheduleCallback) this.onScheduleCallback({ ...this.mockSchedule });
      return;
    }

    if (!this.schedCharacteristic) {
      this.log('error', 'Kênh SCHED chưa được kết nối.');
      return;
    }

    await this.queueWrite(this.schedCharacteristic, cmd);
    await this.readSchedule();
  }

  // ==========================================
  // QUẢN LÝ WI-FI (WIFI)
  // ==========================================

  public async startWifiScan(): Promise<void> {
    if (this.isMockMode) {
      this.log('tx', '[Mô phỏng WIFI]: scan=1');
      this.mockWifi.scanning = 1;
      if (this.onWifiCallback) this.onWifiCallback({ ...this.mockWifi });

      setTimeout(() => {
        this.mockWifi.scanning = 0;
        this.log('rx', '[Mô phỏng WIFI]: Hoàn tất quét mạng Wi-Fi');
        if (this.onWifiCallback) this.onWifiCallback({ ...this.mockWifi });
      }, 2500);
      return;
    }

    if (!this.wifiCharacteristic) {
      this.log('error', 'Kênh WIFI chưa được kết nối.');
      return;
    }

    await this.queueWrite(this.wifiCharacteristic, 'scan=1');

    // Bắt đầu thăm dò (polling) mỗi 1.5 giây cho tới khi scanning === 0
    if (this.wifiPollTimer) clearInterval(this.wifiPollTimer);
    let attempts = 0;
    this.wifiPollTimer = window.setInterval(async () => {
      attempts++;
      const status = await this.readWifiStatus();
      if (!status || status.scanning === 0 || attempts > 15) {
        if (this.wifiPollTimer) {
          clearInterval(this.wifiPollTimer);
          this.wifiPollTimer = null;
        }
      }
    }, 1500);
  }

  public async readWifiStatus(): Promise<WifiStatus | null> {
    if (this.isMockMode) {
      if (this.onWifiCallback) this.onWifiCallback(this.mockWifi);
      return this.mockWifi;
    }

    if (!this.wifiCharacteristic) {
      this.log('error', 'Kênh WIFI chưa được kết nối.');
      return null;
    }

    try {
      const value = await this.wifiCharacteristic.readValue();
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(value);
      this.log('rx', `RX Wi-Fi: ${text}`);

      const status: WifiStatus = JSON.parse(text);
      if (this.onWifiCallback) {
        this.onWifiCallback(status);
      }
      return status;
    } catch (err: any) {
      this.log('error', `Lỗi đọc trạng thái Wi-Fi: ${err.message || err}`);
      return null;
    }
  }

  public async connectWifi(ssid: string, pass: string): Promise<void> {
    const cmd = `ssid=${encodeURIComponent(ssid)}&pass=${encodeURIComponent(pass)}`;

    if (this.isMockMode) {
      this.log('tx', `[Mô phỏng WIFI]: ssid=${ssid}&pass=********`);
      this.mockWifi.savedSsid = ssid;
      this.mockWifi.connected = 1;
      this.mockWifi.ip = '192.168.1.188';

      this.onConnectionCallback?.('reconnecting', 'Đèn đang khởi động lại để kết nối mạng Wi-Fi...');
      setTimeout(() => {
        this.onConnectionCallback?.('connected');
        this.log('info', `[Mô phỏng] Đèn đã kết nối Wi-Fi thành công! IP: ${this.mockWifi.ip}`);
        if (this.onWifiCallback) this.onWifiCallback({ ...this.mockWifi });
      }, 3000);
      return;
    }

    if (!this.wifiCharacteristic) {
      this.log('error', 'Kênh WIFI chưa được kết nối.');
      return;
    }

    this.log('info', `Đang lưu cấu hình Wi-Fi "${ssid}" vào đèn...`);
    await this.queueWrite(this.wifiCharacteristic, `ssid=${ssid}&pass=${pass}`);

    // Thiết bị sẽ khởi động lại để kết nối Wi-Fi -> BLE sẽ ngắt kết nối tạm thời
    this.onConnectionCallback?.(
      'reconnecting',
      'Đèn đang khởi động lại để gia nhập mạng Wi-Fi. Đang chờ kết nối lại...'
    );

    // Tự động thử kết nối lại sau 4 giây
    setTimeout(() => {
      this.connect();
    }, 4000);
  }

  public setLastKnownState(state: LedState) {
    this.lastSentState = { ...state };
  }

  // ==========================================
  // MÔ PHỎNG VIRTUAL SIMULATOR
  // ==========================================
  /** legacy = true: giả lập firmware cũ CitoLedSmart (không có kênh MESH) */
  public enableMockMode(enabled: boolean, legacy: boolean = false) {
    this.isMockMode = enabled;
    this.mockLegacy = legacy;
    if (!enabled && this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  private static readonly MOCK_GATEWAY_ID = 'C1A0F1';

  private setupMockMesh() {
    const base = {
      tempC: 31.5,
      rssi: 0,
      ack: 0 as MeshAck,
      isGateway: 0,
      hops: 0,
      tvalid: 1,
      fw: 1,
      fanDuty: 0,
    };
    const lamps: MeshLamp[] = [
      { ...base, id: BleService.MOCK_GATEWAY_ID, name: 'Bể chính', group: 1, online: 1, power: 1, r: 80, g: 50, b: 10, cw: 0, bri: 100, isGateway: 1 },
      { ...base, id: 'C1A0F2', name: 'Bể phụ', group: 1, online: 1, power: 1, r: 80, g: 50, b: 10, cw: 0, bri: 100, rssi: -52 },
      { ...base, id: 'C1A0F3', name: 'Tủ cây', group: 2, online: 1, power: 1, r: 0, g: 0, b: 0, cw: 90, bri: 70, rssi: -71, hops: 0 },
      { ...base, id: 'C1A0F4', name: '', group: 0, online: 0, power: 0, r: 0, g: 0, b: 0, cw: 0, bri: 0, rssi: -84 },
    ];
    this.meshLamps = new Map(lamps.map((l) => [l.id, l]));
    this.meshInfo = {
      v: 1,
      self: BleService.MOCK_GATEWAY_ID,
      name: 'Bể chính',
      grp: 1,
      net: 1,
      ch: 1,
      relay: 0,
      irf: 0,
      mode: 'AP',
      total: lamps.length,
      online: lamps.filter((l) => l.online === 1).length,
    };
    this.meshSupported = true;
    this.syncMockGatewayLamp();
    this.emitMesh();
  }

  private mockTargetsGateway(): boolean {
    if (!this.meshSupported) return true;
    const gw = this.meshLamps.get(BleService.MOCK_GATEWAY_ID);
    return !gw || targetIncludesLamp(this.target, gw);
  }

  private syncMockGatewayLamp() {
    const gw = this.meshLamps.get(BleService.MOCK_GATEWAY_ID);
    if (!gw) return;
    const s = this.mockState;
    this.meshLamps.set(gw.id, {
      ...gw,
      power: s.power,
      r: Math.round(s.r),
      g: Math.round(s.g),
      b: Math.round(s.b),
      cw: Math.round(s.cw),
      bri: Math.round(s.bri),
      tempC: s.tempC ?? null,
      fanDuty: s.fanDuty ?? 0,
    });
  }

  // Đèn ảo "đang chờ" -> sau ~300ms xác nhận (thỉnh thoảng không trả lời để thử cảnh báo)
  private simulateMockAcks() {
    window.setTimeout(() => {
      let changed = false;
      this.meshLamps.forEach((lamp, id) => {
        if (lamp.ack !== 2) return;
        const fail = Math.random() < 0.1;
        this.meshLamps.set(id, { ...lamp, ack: fail ? 3 : 1, ackAt: fail ? undefined : Date.now() });
        changed = true;
      });
      if (changed) this.emitMesh();
    }, 300);
  }

  private applyMockMeshCommand(cmd: string) {
    const params = new URLSearchParams(cmd);
    const to = params.get('to') || '';
    const op = params.get('op') || 'light';
    const tokens = to.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
    const hits = (l: MeshLamp) =>
      !to ||
      tokens.includes('ALL') ||
      tokens.includes(l.id) ||
      tokens.some((t) => /^G\d$/.test(t) && l.group > 0 && Number(t.substring(1)) === l.group);

    if (op === 'ping' || op === 'page') {
      this.emitMesh();
      return;
    }
    if (op === 'ident') {
      this.log('info', `[Mô phỏng] Đèn ${to} nháy 3 lần để nhận diện.`);
      return;
    }
    if (op === 'sched') {
      this.log('info', `[Mô phỏng] Đèn ${to} đã nhận lịch hẹn giờ.`);
      return;
    }
    if (op === 'cfg') {
      if (params.has('relay') && this.meshInfo) this.meshInfo.relay = Number(params.get('relay'));
      if (params.has('irf') && this.meshInfo) this.meshInfo.irf = Number(params.get('irf'));
      if (params.has('net') && this.meshInfo) this.meshInfo.net = Number(params.get('net'));
      this.emitMesh();
      return;
    }
    // op=light (gõ tay trong console)
    this.meshLamps.forEach((lamp, id) => {
      if (lamp.online !== 1 || !hits(lamp)) return;
      const next = { ...lamp };
      (['power', 'r', 'g', 'b', 'cw', 'bri'] as const).forEach((k) => {
        if (params.has(k)) next[k] = Math.round(Number(params.get(k)));
      });
      this.meshLamps.set(id, next);
      if (lamp.isGateway === 1) {
        Object.assign(this.mockState, {
          power: next.power,
          r: next.r,
          g: next.g,
          b: next.b,
          cw: next.cw,
          bri: next.bri,
        });
        this.emitMockStatus();
      }
    });
    this.emitMesh();
  }

  private connectMock() {
    this.onConnectionCallback?.('scanning');
    this.log('info', '[Mô phỏng] Đang quét tìm đèn ảo Cito Smart Light...');

    setTimeout(() => {
      this.onConnectionCallback?.('connecting');
      this.log('info', '[Mô phỏng] Đang kết nối GATT server ảo...');

      setTimeout(() => {
        this.onConnectionCallback?.('connected');
        this.log('info', '[Mô phỏng] Đã kết nối với Cito Smart Light ảo.');

        if (this.mockLegacy) {
          this.log('info', '[Mô phỏng] Firmware cũ - không có kênh MESH.');
        } else {
          this.setupMockMesh();
        }
        this.emitMockStatus();
        if (this.onScheduleCallback) this.onScheduleCallback(this.mockSchedule);
        if (this.onWifiCallback) this.onWifiCallback(this.mockWifi);

        // Tự động đồng bộ giờ trong mock mode
        this.syncDeviceTime(true);

        if (this.mockInterval) clearInterval(this.mockInterval);
        this.mockInterval = window.setInterval(() => {
          this.updateMockPhysics();
        }, 3000);
      }, 500);
    }, 600);
  }

  private disconnectMock() {
    this.onConnectionCallback?.('disconnecting');
    this.log('info', '[Mô phỏng] Đang ngắt kết nối thiết bị ảo...');

    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }

    setTimeout(() => {
      this.resetMesh();
      this.onConnectionCallback?.('idle');
      this.log('info', '[Mô phỏng] Đã ngắt kết nối.');
    }, 300);
  }

  private sendMockChanges(changes: Partial<LedState>) {
    Object.assign(this.mockState, changes);

    const parts: string[] = [];
    for (const [k, v] of Object.entries(changes)) {
      if (v !== undefined) {
        if (['r', 'g', 'b', 'cw', 'bri'].includes(k)) {
          parts.push(`${k}=${Math.round(v as number)}`);
        } else {
          parts.push(`${k}=${v}`);
        }
      }
    }

    if (parts.length > 0) {
      const cmd = parts.join('&');
      this.log('tx', `TX: ${cmd}`);
    }

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      this.emitMockStatus();
    }, 120);
  }

  private parseAndApplyMockCommand(cmd: string) {
    const params = new URLSearchParams(cmd);
    const updates: Partial<LedState> = {};

    if (params.has('power')) updates.power = Number(params.get('power'));
    if (params.has('r')) updates.r = Math.round(Number(params.get('r')));
    if (params.has('g')) updates.g = Math.round(Number(params.get('g')));
    if (params.has('b')) updates.b = Math.round(Number(params.get('b')));
    if (params.has('cw')) updates.cw = Math.round(Number(params.get('cw')));
    if (params.has('bri')) updates.bri = Math.round(Number(params.get('bri')));
    if (params.has('gamma')) updates.gamma = Number(params.get('gamma'));
    if (params.has('epoch')) {
      const epoch = Number(params.get('epoch'));
      const tz = Number(params.get('tz') || 420);
      updates.tvalid = 1;
      const d = new Date(epoch * 1000);
      updates.now = d.toLocaleTimeString('vi-VN', { hour12: false });
      this.log('info', `[Mô phỏng] Đèn đã nhận giờ chuẩn: ${updates.now} (tz=${tz})`);
    }

    Object.assign(this.mockState, updates);
    this.emitMockStatus();
  }

  private updateMockPhysics() {
    if (this.mockState.tvalid === 1) {
      this.mockState.now = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    }

    if (this.mockState.power === 1) {
      const totalPower =
        ((this.mockState.r + this.mockState.g + this.mockState.b + this.mockState.cw) / 400) *
        (this.mockState.bri / 100);

      const targetTemp = 28 + totalPower * 35;
      const currentTemp = this.mockState.tempC ?? 32;
      const newTemp = Math.round(currentTemp + (targetTemp - currentTemp) * 0.2 + (Math.random() * 0.4 - 0.2));

      let fanDuty = 0;
      if (newTemp > 40) {
        fanDuty = Math.min(100, Math.round(((newTemp - 40) / 20) * 100));
      }

      this.mockState.tempC = newTemp;
      this.mockState.fanDuty = fanDuty;
    } else {
      const currentTemp = this.mockState.tempC ?? 32;
      this.mockState.tempC = Math.max(26, Math.round(currentTemp - 1));
      this.mockState.fanDuty = 0;
    }

    this.emitMockStatus();
  }

  private emitMockStatus() {
    const statusPayload = JSON.stringify(this.mockState);
    this.log('rx', `RX: ${statusPayload}`);
    if (this.onStatusCallback) {
      this.onStatusCallback({ ...this.mockState });
    }
    if (this.meshSupported) {
      this.syncMockGatewayLamp();
      this.emitMesh();
    }
  }
}

export const bleService = new BleService();
