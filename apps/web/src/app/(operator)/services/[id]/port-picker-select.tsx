'use client';

import { inventoryApi, type PanelWithAvailability } from '@/lib/api/inventory';
import type { DatacenterDto, PortDto } from '@xc/types';
import { useState } from 'react';

const SEL =
  'w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-blue-400';

type RoomOption = {
  roomId: string;
  roomName: string;
  roomCode: string;
  available: number;
};

interface Props {
  token: string;
  sites: DatacenterDto[];
  portId: string;
  portLabel: string;
  onChange: (portId: string, portLabel: string) => void;
}

export function PortPickerSelect({ token, sites, portId, portLabel, onChange }: Props) {
  const [siteId, setSiteId] = useState('');
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [roomId, setRoomId] = useState('');
  const [panels, setPanels] = useState<PanelWithAvailability[]>([]);
  const [panelId, setPanelId] = useState('');
  const [ports, setPorts] = useState<PortDto[]>([]);
  const [loading, setLoading] = useState<'room' | 'panel' | 'port' | ''>('');

  async function handleSite(id: string) {
    setSiteId(id);
    setRoomId(''); setPanelId('');
    setRooms([]); setPanels([]); setPorts([]);
    if (!id) return;
    setLoading('room');
    const data = await inventoryApi.getSiteAvailability(token, id).catch(() => null);
    setRooms((data?.rooms ?? []).filter((r) => r.available > 0));
    setLoading('');
  }

  async function handleRoom(id: string) {
    setRoomId(id);
    setPanelId(''); setPanels([]); setPorts([]);
    if (!id) return;
    setLoading('panel');
    const data = await inventoryApi.listAllRoomPanels(token, id).catch(() => []);
    setPanels(data);
    setLoading('');
  }

  async function handlePanel(id: string) {
    setPanelId(id);
    setPorts([]);
    if (!id) return;
    setLoading('port');
    const data = await inventoryApi.listAvailablePorts(token, id).catch(() => []);
    setPorts(data);
    setLoading('');
  }

  function handlePortSelect(id: string) {
    const port = ports.find((p) => p.id === id);
    if (port) onChange(port.id, port.label);
  }

  if (portId) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-gray-800">{portLabel}</span>
        <button
          type="button"
          onClick={() => onChange('', '')}
          className="text-xs text-gray-400 underline hover:text-red-500"
        >
          change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <select value={siteId} onChange={(e) => handleSite(e.target.value)} className={SEL}>
        <option value="">— Site —</option>
        {sites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.code})
          </option>
        ))}
      </select>

      {siteId && (
        <select
          value={roomId}
          onChange={(e) => handleRoom(e.target.value)}
          disabled={loading === 'room'}
          className={SEL}
        >
          <option value="">
            {loading === 'room' ? 'Loading…' : rooms.length ? '— Room —' : 'No rooms with free ports'}
          </option>
          {rooms.map((r) => (
            <option key={r.roomId} value={r.roomId}>
              {r.roomName} ({r.roomCode}) — {r.available} free
            </option>
          ))}
        </select>
      )}

      {roomId && (
        <select
          value={panelId}
          onChange={(e) => handlePanel(e.target.value)}
          disabled={loading === 'panel'}
          className={SEL}
        >
          <option value="">{loading === 'panel' ? 'Loading…' : '— Panel —'}</option>
          {panels.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.name}
              {p.availability ? ` (${p.availability.available} free)` : ''}
            </option>
          ))}
        </select>
      )}

      {panelId && (
        <select
          value=""
          onChange={(e) => handlePortSelect(e.target.value)}
          disabled={loading === 'port'}
          className={SEL}
        >
          <option value="">
            {loading === 'port' ? 'Loading…' : ports.length ? '— Port —' : 'No available ports'}
          </option>
          {ports.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} ({p.mediaType} / {p.connectorType})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
