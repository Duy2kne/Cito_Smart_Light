import { ControlTarget, MeshLamp } from '../types';

export const MESH_NAME_MAX_BYTES = 20;
export const MESH_GROUP_MAX = 8;

const encoder = new TextEncoder();

export function utf8Length(s: string): number {
  return encoder.encode(s).length;
}

/**
 * Tên gợi nhớ gửi xuống firmware: bỏ ký tự phá giao thức (" \ & = ,) và ký tự
 * điều khiển, cắt tối đa 20 byte UTF-8 mà không cắt ngang một ký tự.
 */
export function sanitizeLampName(input: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = input.replace(/["\\&=,\u0000-\u001f\u007f]/g, '');
  let out = '';
  let bytes = 0;
  for (const ch of cleaned) {
    const n = utf8Length(ch);
    if (bytes + n > MESH_NAME_MAX_BYTES) break;
    out += ch;
    bytes += n;
  }
  return out;
}

export function lampDisplayName(lamp: Pick<MeshLamp, 'id' | 'name'>): string {
  return lamp.name ? lamp.name : `Đèn ${lamp.id}`;
}

/** Đèn có nằm trong đích điều khiển không (đích 'self' = chỉ đèn cổng) */
export function targetIncludesLamp(target: ControlTarget, lamp: MeshLamp): boolean {
  switch (target.kind) {
    case 'self':
      return lamp.isGateway === 1;
    case 'all':
      return true;
    case 'group':
      return lamp.group === target.group;
    case 'lamps':
      return target.ids.includes(lamp.id);
  }
}

export function targetIncludesGateway(target: ControlTarget, lamps: MeshLamp[], gatewayId?: string): boolean {
  if (target.kind === 'self' || target.kind === 'all') return true;
  const gw = lamps.find((l) => l.isGateway === 1) ?? (gatewayId ? lamps.find((l) => l.id === gatewayId) : undefined);
  if (!gw) return target.kind === 'lamps' ? false : true;
  return targetIncludesLamp(target, gw);
}

export function sameTarget(a: ControlTarget, b: ControlTarget): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'group' && b.kind === 'group') return a.group === b.group;
  if (a.kind === 'lamps' && b.kind === 'lamps') {
    return a.ids.length === b.ids.length && a.ids.every((id) => b.ids.includes(id));
  }
  return true;
}

/** Các nhóm đang có ít nhất 1 đèn, tăng dần */
export function usedGroups(lamps: MeshLamp[]): number[] {
  const set = new Set<number>();
  lamps.forEach((l) => {
    if (l.group > 0) set.add(l.group);
  });
  return Array.from(set).sort((a, b) => a - b);
}

export function rssiLevel(rssi: number): 0 | 1 | 2 | 3 {
  if (!rssi) return 0; // không rõ
  if (rssi >= -60) return 3;
  if (rssi >= -75) return 2;
  return 1;
}

// ------------------------------------------
// Tên nhóm - firmware chỉ biết số nhóm, tên lưu trong trình duyệt
// ------------------------------------------
const GROUP_NAMES_KEY = 'cito.groupNames';

export type GroupNames = Record<number, string>;

export function loadGroupNames(): GroupNames {
  try {
    const raw = localStorage.getItem(GROUP_NAMES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as GroupNames) : {};
  } catch {
    return {};
  }
}

export function saveGroupNames(names: GroupNames): void {
  try {
    localStorage.setItem(GROUP_NAMES_KEY, JSON.stringify(names));
  } catch {
    // Trình duyệt chặn lưu trữ - bỏ qua, tên nhóm chỉ mất khi tải lại trang
  }
}

export function groupLabel(group: number, names: GroupNames): string {
  const n = names[group];
  return n ? n : `Nhóm ${group}`;
}
