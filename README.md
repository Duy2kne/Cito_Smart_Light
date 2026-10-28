# Cito Smart Light Web Controller

Ứng dụng web tiến tiến điều khiển trực tiếp đèn thông minh **Cito Smart Light** thông qua công nghệ **Web Bluetooth Low Energy (BLE)** và cấu hình **Wi-Fi** để đồng bộ thời gian thực (NTP).

---

## 🌟 Tính Năng Chính

- **Mô Phỏng Quang Học Màu Ánh Sáng Thực Tế (Fixture Visualizer)**:
  - Khung hiển thị mô phỏng quang phổ trộn màu thực tế phát ra từ máng đèn LED (R, G, B, CW) và độ sáng.
  - Mô phỏng chùm ánh sáng hình nón tỏa xuống mặt nền/bể thủy sinh và độ phản xạ bề mặt trực quan.
  - Hiển thị trực tiếp mã màu Hex, cường độ phát quang tổng thể và nút bật/tắt nhanh ngay trên đèn.

- **Chọn Màu Trực Tiếp & Mã Màu Hex (Spectrum Color Picker)**:
  - **Dải màu quang phổ 360°**: Chạm hoặc lướt trực tiếp trên dải màu để đổi màu đèn ngay lập tức theo thời gian thực mà không cần mẫu sẵn hay thao tác rườm rà.
  - **Hiển thị mã màu Hex thời gian thực** (ví dụ: `#CC801A`): Xem mã màu Hex thực tế của đèn, sao chép 1 chạm hoặc chọn màu tự do từ bảng màu thiết bị.
  - Tinh chỉnh nâng cao 4 kênh LED độc lập: **Đỏ (R)**, **Xanh Lá (G)**, **Xanh Dương (B)**, và **Trắng (CW)** theo số nguyên 0% - 100%.
  - Nút bật/tắt nguồn tức thì (`BẬT NGUỒN` / `TẮT NGUỒN`) và phím tắt nhanh 90%, 0%, 100%.

- **Lập Lịch Hẹn Giờ Thông Minh (Schedule Manager)**:
  - Hỗ trợ thiết lập nhiều mốc giờ bật / tắt tự động trong ngày.
  - Tùy chọn lặp lại theo từng ngày trong tuần (Thứ 2 - Chủ Nhật).
  - Tùy chỉnh hiệu ứng tăng/giảm độ sáng dần (Ramp-up / Ramp-down) mô phỏng bình minh và hoàng hôn.
  - Lưu cấu hình trực tiếp vào bộ nhớ đèn (Flash/NVS).

- **Cấu Hình Wi-Fi (NTP Time Sync)**:
  - Quét danh sách các mạng Wi-Fi khả dụng xung quanh đèn.
  - Cung cấp SSID & mật khẩu để đèn kết nối Internet và tự động cập nhật thời gian thực qua máy chủ NTP, giúp lịch hẹn giờ chạy chuẩn xác ngay cả khi không kết nối Bluetooth.

- **Giám Sát Cảm Biến & Nhiệt Độ (Telemetry)**:
  - Hiển thị nhiệt độ hoạt động (°C) và tốc độ quạt tản nhiệt (%) theo thời gian thực nhận qua kênh Notify.

- **Bảng Điều Khiển Lệnh Thô (Live Console)**:
  - Theo dõi nhật ký truyền nhận dữ liệu BLE 2 chiều (TX/RX).
  - Gửi các gói lệnh chuỗi thô để chẩn đoán và kiểm thử.

---

## 📡 Thông Số Kỹ Thuật BLE (GATT Architecture)

| Tên Dịch Vụ / Đặc Tính | Mã UUID (128-bit) | Thuộc tính (Properties) | Chức năng |
| :--- | :--- | :--- | :--- |
| **Cito Main Service** | `6e400001-b5a3-f393-e0a9-e50e24dcca9e` | Primary Service | Dịch vụ chính của đèn |
| **Write / Control** | `6e400002-b5a3-f393-e0a9-e50e24dcca9e` | `WRITE` / `WRITE_NO_RESP` | Gửi lệnh màu sắc và trạng thái nguồn |
| **Notify / Telemetry** | `6e400003-b5a3-f393-e0a9-e50e24dcca9e` | `NOTIFY` / `READ` | Đèn phản hồi nhiệt độ và tốc độ quạt |
| **Schedule Config** | `6e400004-b5a3-f393-e0a9-e50e24dcca9e` | `WRITE`, `READ`, `NOTIFY` | Đồng bộ cấu hình lịch hẹn giờ |
| **Wi-Fi Config** | `6e400005-b5a3-f393-e0a9-e50e24dcca9e` | `WRITE`, `READ`, `NOTIFY` | Quét mạng Wi-Fi và truyền thông tin kết nối |

### Định Dạng Dữ Liệu Truyền Nhận

- **Lệnh điều khiển màu (App ➔ Đèn)**:
  ```text
  power=1&r=90&g=90&b=90&cw=90
  ```
- **Gói phản hồi đo đạc (Đèn ➔ App qua Notify)**:
  ```text
  temp=38.5&fan=65
  ```
- **Lệnh cấu hình Wi-Fi (App ➔ Đèn)**:
  ```text
  ssid=Ten_Wifi&pass=Mat_Khau
  ```

---

## 💻 Yêu Cầu Thiết Bị & Trình Duyệt

- **Máy tính (Windows, macOS, Linux, ChromeOS)**: Google Chrome, Microsoft Edge, Opera hoặc bất kỳ trình duyệt Chromium nào có hỗ trợ Web Bluetooth API.
- **Android**: Google Chrome, Microsoft Edge for Android.
- **iPhone / iPad (iOS)**: Trình duyệt Safari không hỗ trợ Web Bluetooth. Vui lòng sử dụng ứng dụng **Bluefy** (miễn phí trên App Store) và mở liên kết trang web bên trong ứng dụng.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide React Icons
- **Animation**: Motion (`motion/react`)
- **API**: Web Bluetooth API (`navigator.bluetooth`)

---

## 🚀 Cài Đặt & Khởi Chạy Dự Án

1. **Cài đặt thư viện phụ thuộc**:
   ```bash
   npm install
   ```

2. **Chạy môi trường phát triển (Dev Server)**:
   ```bash
   npm run dev
   ```
   Truy cập vào địa chỉ: `http://localhost:3000`

3. **Kiểm tra kiểu dữ liệu (Linting)**:
   ```bash
   npm run lint
   ```

4. **Đóng gói sản phẩm (Production Build)**:
   ```bash
   npm run build
   ```
