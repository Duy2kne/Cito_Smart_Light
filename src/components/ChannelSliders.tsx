import { useState, useEffect } from 'react';
import { Palette, RotateCcw, Power, Copy, Check, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { getChannelHex, hexToRgbPercent, hueToRgbPercent } from '../utils/colorUtils';

interface ChannelSlidersProps {
  r: number;
  g: number;
  b: number;
  cw: number;
  power?: number;
  onChannelChange: (channel: 'r' | 'g' | 'b' | 'cw', value: number) => void;
  onSetAllChannels?: (value: number) => void;
  onSetRgbCw?: (r: number, g: number, b: number, cw?: number) => void;
  onTogglePower?: () => void;
}

interface SingleChannelConfig {
  key: 'r' | 'g' | 'b' | 'cw';
  label: string;
  subLabel: string;
  accentClass: string;
  dotClass: string;
  gradientTrack: (val: number) => string;
  textColor: string;
  glowColor: string;
}

export function ChannelSliders({
  r,
  g,
  b,
  cw,
  power = 1,
  onChannelChange,
  onSetAllChannels,
  onSetRgbCw,
  onTogglePower,
}: ChannelSlidersProps) {
  // Lấy mã Hex thực tế của màu hiện tại
  const currentHex = getChannelHex(r, g, b, cw);
  const [hexInput, setHexInput] = useState(currentHex);
  const [copied, setCopied] = useState(false);
  const [hueValue, setHueValue] = useState(30);
  const [showAdvancedSliders, setShowAdvancedSliders] = useState(true);

  // Đồng bộ mã hex khi các kênh màu thay đổi từ bên ngoài
  useEffect(() => {
    setHexInput(currentHex);
  }, [currentHex]);

  const channels: SingleChannelConfig[] = [
    {
      key: 'r',
      label: 'Màu Đỏ',
      subLabel: 'Ánh sáng đỏ',
      accentClass: 'accent-red-500',
      dotClass: 'bg-red-500 shadow-xs shadow-red-500/50',
      gradientTrack: (val) =>
        `linear-gradient(to right, #ef4444 0%, #ef4444 ${val}%, rgba(120, 120, 130, 0.25) ${val}%, rgba(120, 120, 130, 0.25) 100%)`,
      textColor: 'text-red-500 dark:text-red-400',
      glowColor: 'shadow-red-500/20',
    },
    {
      key: 'g',
      label: 'Màu Xanh Lá',
      subLabel: 'Ánh sáng xanh lá',
      accentClass: 'accent-emerald-500',
      dotClass: 'bg-emerald-500 shadow-xs shadow-emerald-500/50',
      gradientTrack: (val) =>
        `linear-gradient(to right, #10b981 0%, #10b981 ${val}%, rgba(120, 120, 130, 0.25) ${val}%, rgba(120, 120, 130, 0.25) 100%)`,
      textColor: 'text-emerald-500 dark:text-emerald-400',
      glowColor: 'shadow-emerald-500/20',
    },
    {
      key: 'b',
      label: 'Màu Xanh Dương',
      subLabel: 'Ánh sáng xanh dương',
      accentClass: 'accent-blue-500',
      dotClass: 'bg-blue-500 shadow-xs shadow-blue-500/50',
      gradientTrack: (val) =>
        `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${val}%, rgba(120, 120, 130, 0.25) ${val}%, rgba(120, 120, 130, 0.25) 100%)`,
      textColor: 'text-blue-500 dark:text-blue-400',
      glowColor: 'shadow-blue-500/20',
    },
    {
      key: 'cw',
      label: 'Màu Trắng',
      subLabel: 'Ánh sáng trắng',
      accentClass: 'accent-white',
      dotClass: 'bg-white border border-zinc-400 dark:border-zinc-300 shadow-xs',
      gradientTrack: (val) =>
        `linear-gradient(to right, #ffffff 0%, #ffffff ${val}%, rgba(120, 120, 130, 0.25) ${val}%, rgba(120, 120, 130, 0.25) 100%)`,
      textColor: 'text-zinc-800 dark:text-zinc-100',
      glowColor: 'shadow-white/20',
    },
  ];

  const values = {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    cw: Math.round(cw),
  };

  // Chọn màu trực tiếp từ dải màu quang phổ (Spectrum Hue Bar)
  const handleHueBarChange = (hue: number) => {
    setHueValue(hue);
    const rgb = hueToRgbPercent(hue);
    if (onSetRgbCw) {
      onSetRgbCw(rgb.r, rgb.g, rgb.b, cw);
    } else {
      onChannelChange('r', rgb.r);
      onChannelChange('g', rgb.g);
      onChannelChange('b', rgb.b);
    }
  };

  // Áp dụng màu từ mã Hex (ví dụ: #CC801A)
  const applyHexColor = (hexStr: string) => {
    const cleanHex = hexStr.startsWith('#') ? hexStr : `#${hexStr}`;
    const rgb = hexToRgbPercent(cleanHex);
    if (onSetRgbCw) {
      onSetRgbCw(rgb.r, rgb.g, rgb.b, cw);
    } else {
      onChannelChange('r', rgb.r);
      onChannelChange('g', rgb.g);
      onChannelChange('b', rgb.b);
    }
    setHexInput(cleanHex.toUpperCase());
  };

  // Sao chép mã màu Hex
  const handleCopyHex = () => {
    navigator.clipboard.writeText(currentHex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSetAll = (val: number) => {
    if (onSetAllChannels) {
      onSetAllChannels(val);
    } else {
      onChannelChange('r', val);
      onChannelChange('g', val);
      onChannelChange('b', val);
      onChannelChange('cw', val);
    }
  };

  const handleStep = (channel: 'r' | 'g' | 'b' | 'cw', delta: number) => {
    const current = values[channel];
    const next = Math.max(0, Math.min(100, Math.round(current + delta)));
    onChannelChange(channel, next);
  };

  return (
    <div className="backdrop-blur-xl bg-white/70 dark:bg-zinc-900/60 rounded-3xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/[0.08] shadow-lg shadow-zinc-900/5 dark:shadow-2xl dark:shadow-black/40 transition-all space-y-5">
      {/* TIÊU ĐỀ & CÁC NÚT TÁC VỤ NHANH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Palette className="w-4 h-4 text-cyan-500" />
            Điều Chỉnh Màu Sắc Đèn
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Chọn trực tiếp trên dải màu hoặc tinh chỉnh từng kênh theo ý muốn
          </p>
        </div>

        {/* Nút Bật/Tắt nguồn & Đặt nhanh */}
        <div className="flex items-center gap-2 flex-wrap">
          {onTogglePower && (
            <button
              id="channel-power-toggle"
              onClick={onTogglePower}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                power === 1
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 ring-2 ring-emerald-400/30'
                  : 'backdrop-blur-md bg-zinc-200/90 dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-zinc-300 dark:border-white/[0.1]'
              }`}
              title={power === 1 ? 'Đèn đang BẬT - Nhấn để TẮT nguồn' : 'Đèn đang TẮT - Nhấn để BẬT nguồn'}
            >
              <Power className={`w-3.5 h-3.5 ${power === 1 ? 'text-white' : 'text-zinc-500'}`} />
              <span>{power === 1 ? 'BẬT NGUỒN' : 'TẮT NGUỒN'}</span>
            </button>
          )}

          <button
            id="channels-default-90"
            onClick={() => handleSetAll(90)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-xs shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-400 transition-all cursor-pointer active:scale-95"
            title="Đặt tất cả màu về mặc định 90%"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc Định 90%</span>
          </button>

          <button
            id="channels-all-zero"
            onClick={() => handleSetAll(0)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium backdrop-blur-md bg-zinc-100/90 hover:bg-zinc-200/90 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-white/[0.08] transition-all cursor-pointer active:scale-95"
          >
            0%
          </button>
          <button
            id="channels-all-full"
            onClick={() => handleSetAll(100)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium backdrop-blur-md bg-zinc-100/90 hover:bg-zinc-200/90 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-white/[0.08] transition-all cursor-pointer active:scale-95"
          >
            100%
          </button>
        </div>
      </div>

      {/* KHU VỰC CHỌN MÀU TRỰC TIẾP: DẢI MÀU QUANG PHỔ & MÃ MÀU HEX */}
      <div className="p-4 sm:p-5 rounded-2xl backdrop-blur-lg bg-zinc-50/80 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-white/[0.07] space-y-3 shadow-xs">
        {/* HÀNG HIỂN THỊ MÃ MÀU HEX & NÚT SAO CHÉP */}
        <div className="flex items-center justify-between gap-3">
          {/* Nút xem trước màu & mở bảng màu hệ thống */}
          <div
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-300/80 dark:border-white/[0.1] bg-white/90 dark:bg-zinc-900/90 shadow-2xs hover:border-cyan-500 transition-all cursor-pointer group"
            title="Bấm để mở bảng chọn màu tự do"
          >
            <span
              className="w-4 h-4 rounded-full border border-black/20 dark:border-white/30 shadow-xs shrink-0 transition-transform group-hover:scale-110"
              style={{ backgroundColor: currentHex }}
            />
            <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-wider">
              {currentHex}
            </span>
            <input
              id="native-color-picker-input"
              type="color"
              value={currentHex.length === 7 ? currentHex : '#CC801A'}
              onChange={(e) => applyHexColor(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Chọn màu tự do"
            />
          </div>

          {/* Nút sao chép mã màu Hex */}
          <button
            id="copy-hex-btn"
            onClick={handleCopyHex}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium backdrop-blur-md bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.08] transition-all cursor-pointer active:scale-95"
            title="Sao chép mã màu Hex"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-semibold text-emerald-500">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[11px]">Sao chép</span>
              </>
            )}
          </button>
        </div>

        {/* THANH DẢI MÀU QUANG PHỔ (CẦU VỒNG 360 ĐỘ) */}
        <div className="relative flex items-center pt-1">
          <input
            id="hue-spectrum-bar"
            type="range"
            min="0"
            max="360"
            step="1"
            value={hueValue}
            onChange={(e) => handleHueBarChange(parseInt(e.target.value, 10))}
            className="w-full h-6 rounded-xl appearance-none cursor-pointer border border-zinc-300/80 dark:border-white/20 shadow-inner focus:outline-hidden"
            style={{
              background:
                'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
            }}
            title="Chạm hoặc kéo trực tiếp để đổi màu"
          />
        </div>
      </div>

      {/* THANH ĐIỀU CHỈNH 4 KÊNH MÀU CHI TIẾT (ĐỎ, XANH LÁ, XANH DƯƠNG, TRẮNG) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowAdvancedSliders(!showAdvancedSliders)}
            className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-cyan-500 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-500" />
            <span>Điều Chỉnh Màu Sắc</span>
            {showAdvancedSliders ? (
              <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </button>
        </div>

        {showAdvancedSliders && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 pt-1">
            {channels.map((ch) => {
              const val = values[ch.key];
              return (
                <div
                  key={ch.key}
                  className="p-4 rounded-2xl backdrop-blur-lg bg-zinc-50/80 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-white/[0.07] space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-white/[0.14] transition-all"
                >
                  {/* Tiêu đề kênh */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${ch.dotClass}`} />
                        <span className={`text-xs font-bold ${ch.textColor}`}>
                          {ch.label}
                        </span>
                      </div>
                    </div>

                    {/* Nhập số nguyên trực tiếp */}
                    <div className="flex items-center gap-1">
                      <input
                        id={`input-ch-${ch.key}`}
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={val}
                        onChange={(e) => {
                          const num = parseInt(e.target.value, 10);
                          if (!isNaN(num)) {
                            onChannelChange(ch.key, Math.max(0, Math.min(100, Math.round(num))));
                          }
                        }}
                        className="w-16 text-right px-2 py-0.5 text-xs font-mono font-bold rounded-lg backdrop-blur-md bg-white/90 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 border border-zinc-300/80 dark:border-white/[0.1] focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                      />
                      <span className="text-xs font-mono font-bold text-zinc-500">%</span>
                    </div>
                  </div>

                  {/* Thanh trượt */}
                  <div className="relative flex items-center">
                    <input
                      id={`slider-ch-${ch.key}`}
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={val}
                      onChange={(e) => onChannelChange(ch.key, Math.round(parseInt(e.target.value, 10)))}
                      className={`w-full h-2.5 rounded-lg appearance-none cursor-pointer ${ch.accentClass} focus:outline-hidden border border-zinc-300/80 dark:border-white/20`}
                      style={{
                        background: ch.gradientTrack(val),
                      }}
                    />
                  </div>

                  {/* Nút tăng giảm nhanh */}
                  <div className="flex items-center justify-between pt-0.5 text-[11px] font-mono">
                    <div className="flex items-center gap-1">
                      <button
                        id={`ch-${ch.key}-min`}
                        onClick={() => onChannelChange(ch.key, 0)}
                        className="px-2 py-0.5 rounded-lg backdrop-blur-md bg-white/80 hover:bg-zinc-100 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-zinc-500 dark:text-zinc-400 border border-zinc-200/80 dark:border-white/[0.06] cursor-pointer transition-all active:scale-95"
                      >
                        0%
                      </button>
                      <button
                        id={`ch-${ch.key}-minus-5`}
                        onClick={() => handleStep(ch.key, -5)}
                        className="px-2 py-0.5 rounded-lg backdrop-blur-md bg-white/80 hover:bg-zinc-100 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.06] cursor-pointer transition-all active:scale-95"
                      >
                        -5%
                      </button>
                      <button
                        id={`ch-${ch.key}-minus-1`}
                        onClick={() => handleStep(ch.key, -1)}
                        className="px-2 py-0.5 rounded-lg backdrop-blur-md bg-white/80 hover:bg-zinc-100 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.06] cursor-pointer transition-all active:scale-95"
                      >
                        -1%
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        id={`ch-${ch.key}-plus-1`}
                        onClick={() => handleStep(ch.key, 1)}
                        className="px-2 py-0.5 rounded-lg backdrop-blur-md bg-white/80 hover:bg-zinc-100 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.06] cursor-pointer transition-all active:scale-95"
                      >
                        +1%
                      </button>
                      <button
                        id={`ch-${ch.key}-plus-5`}
                        onClick={() => handleStep(ch.key, 5)}
                        className="px-2 py-0.5 rounded-lg backdrop-blur-md bg-white/80 hover:bg-zinc-100 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.06] cursor-pointer transition-all active:scale-95"
                      >
                        +5%
                      </button>
                      <button
                        id={`ch-${ch.key}-max`}
                        onClick={() => onChannelChange(ch.key, 100)}
                        className="px-2 py-0.5 rounded-lg backdrop-blur-md bg-white/80 hover:bg-zinc-100 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-zinc-500 dark:text-zinc-400 border border-zinc-200/80 dark:border-white/[0.06] cursor-pointer transition-all active:scale-95"
                      >
                        100%
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
