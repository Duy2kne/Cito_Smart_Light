import {
  LedState,
  ConnectionStatus,
  BleLogEntry,
  ScheduleData,
  ScheduleSlot,
  WifiStatus,
} from '../types';

export const CITO_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const CITO_WRITE_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const CITO_NOTIFY_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
export const CITO_SCHED_CHAR_UUID = '6e400004-b5a3-f393-e0a9-e50e24dcca9e';
export const CITO_WIFI_CHAR_UUID = '6e400005-b5a3-f393-e0a9-e50e24dcca9e';
export const CITO_DEVICE_NAME = 'CitoLedSmart';

type StatusCallback = (state: Partial<LedState>) => void;
type ConnectionCallback = (status: ConnectionStatus, errorMsg?: string) => void;
type LogCallback = (log: BleLogEntry) => void;
type ScheduleCallback = (data: ScheduleData) => void;
type WifiCallback = (status: WifiStatus) => void;

export class BleService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private notifyCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private schedCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private wifiCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

  private onStatusCallback: StatusCallback | null = null;
  private onConnectionCallback: ConnectionCallback | null = null;
  private onLogCallback: LogCallback | null = null;
  private onScheduleCallback: ScheduleCallback | null = null;
  private onWifiCallback: WifiCallback | null = null;

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

      this.onConnectionCallback?.('connected');
      this.log('info', 'Kết nối thành công với Cito Smart Light!');

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
    if (this.isMockMode) {
      this.sendMockChanges(changes);
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

    this.queueWrite(this.writeCharacteristic, commandText);
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
    if (this.isMockMode) {
      this.log('tx', `[Mô phỏng TX]: ${rawText}`);
      this.parseAndApplyMockCommand(rawText);
      return;
    }
    return this.queueWrite(this.writeCharacteristic, rawText);
  }

  private queueWrite(
    char: BluetoothRemoteGATTCharacteristic | null,
    commandText: string
  ): Promise<void> {
    this.writeQueue = this.writeQueue
      .then(async () => {
        if (!char) {
          this.log('error', `Không thể gửi "${commandText}": Chưa kết nối hoặc kênh không hợp lệ.`);
          return;
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(commandText);

        this.log('tx', `TX: ${commandText}`);
        await char.writeValue(data);
      })
      .catch((err) => {
        this.log('error', `Lỗi ghi BLE: ${err.message || err}`);
      });

    return this.writeQueue;
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
  public enableMockMode(enabled: boolean) {
    this.isMockMode = enabled;
    if (!enabled && this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
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
  }
}

export const bleService = new BleService();
