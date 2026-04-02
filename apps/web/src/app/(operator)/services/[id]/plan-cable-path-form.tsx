'use client';

import { sitesApi } from '@/lib/api/locations';
import { cablePathsApi } from '@/lib/api/topology';
import type { DatacenterDto } from '@xc/types';
import { useEffect, useRef, useState } from 'react';
import { PortPickerSelect } from './port-picker-select';

const btnBase = 'rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60';

type SegmentType = 'patch' | 'trunk' | 'jumper' | 'demarc_extension';

type Segment = {
  _id: number;
  fromPortId: string;
  fromPortLabel: string;
  toPortId: string;
  toPortLabel: string;
  segmentType: SegmentType;
  physicalCableLabel: string;
};

interface Props {
  serviceId: string;
  token: string;
  onCreated: () => void;
  onCancel: () => void;
}

export function PlanCablePathForm({ serviceId, token, onCreated, onCancel }: Props) {
  const nextId = useRef(0);
  const [pathRole, setPathRole] = useState<'primary' | 'diverse'>('primary');
  const [segments, setSegments] = useState<Segment[]>(() => [newSegment(nextId)]);
  const [sites, setSites] = useState<DatacenterDto[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    sitesApi.list(token).then(setSites).catch((e) => setError(`Failed to load sites: ${e?.message ?? e}`));
  }, [token]);

  function addSegment() {
    setSegments((prev) => [...prev, newSegment(nextId)]);
  }

  function removeSegment(id: number) {
    setSegments((prev) => prev.filter((s) => s._id !== id));
  }

  function updateField<K extends keyof Segment>(id: number, key: K, value: Segment[K]) {
    setSegments((prev) => prev.map((s) => (s._id === id ? { ...s, [key]: value } : s)));
  }

  function updatePort(id: number, side: 'from' | 'to', portId: string, portLabel: string) {
    setSegments((prev) =>
      prev.map((s) => {
        if (s._id !== id) return s;
        return side === 'from'
          ? { ...s, fromPortId: portId, fromPortLabel: portLabel }
          : { ...s, toPortId: portId, toPortLabel: portLabel };
      }),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = {
        pathRole,
        notes: notes.trim() || undefined,
        segments: segments.map((s, i) => ({
          sequence: i + 1,
          fromPortId: s.fromPortId,
          toPortId: s.toPortId,
          segmentType: s.segmentType,
          physicalCableLabel: s.physicalCableLabel.trim() || null,
        })),
      };
      await cablePathsApi.create(token, serviceId, body);
      onCreated();
    } catch (e: unknown) {
      const body = (e as any)?.body;
      setError(
        Array.isArray(body?.message)
          ? body.message.join(', ')
          : ((e instanceof Error ? e.message : undefined) ?? 'Failed to create cable path'),
      );
    } finally {
      setBusy(false);
    }
  }

  const allPortsSelected = segments.every((s) => s.fromPortId && s.toPortId);

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4">
      <h3 className="mb-3 text-sm font-semibold text-blue-700">Plan Cable Path</h3>

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mb-3 flex items-center gap-3">
        <label className="text-xs font-medium text-gray-600">Path Role</label>
        <select
          value={pathRole}
          onChange={(e) => setPathRole(e.target.value as 'primary' | 'diverse')}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="primary">Primary</option>
          <option value="diverse">Diverse</option>
        </select>
      </div>

      <div className="mb-3 space-y-2">
        <p className="text-xs font-medium text-gray-500">Segments</p>
        {segments.map((seg, i) => (
          <SegmentCard
            key={seg._id}
            seg={seg}
            index={i}
            sites={sites}
            token={token}
            canRemove={segments.length > 1}
            onUpdate={updateField}
            onPortChange={updatePort}
            onRemove={removeSegment}
          />
        ))}
        <button
          type="button"
          onClick={addSegment}
          className={`${btnBase} border border-dashed border-gray-400 text-gray-600 hover:bg-gray-100`}
        >
          + Add Segment
        </button>
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-gray-600">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full resize-none rounded border border-gray-300 px-2 py-1 text-xs"
          placeholder="Routing notes..."
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !allPortsSelected}
          className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700`}
        >
          {busy ? 'Planning...' : 'Plan Path'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`${btnBase} border border-gray-300 text-gray-600 hover:bg-gray-50`}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// --- Helpers -----------------------------------------------------------------

function newSegment(ref: React.MutableRefObject<number>): Segment {
  return {
    _id: ref.current++,
    fromPortId: '', fromPortLabel: '',
    toPortId: '', toPortLabel: '',
    segmentType: 'patch', physicalCableLabel: '',
  };
}

// --- SegmentCard -------------------------------------------------------------

interface CardProps {
  seg: Segment;
  index: number;
  sites: DatacenterDto[];
  token: string;
  canRemove: boolean;
  onUpdate: <K extends keyof Segment>(id: number, key: K, value: Segment[K]) => void;
  onPortChange: (id: number, side: 'from' | 'to', portId: string, portLabel: string) => void;
  onRemove: (id: number) => void;
}

function SegmentCard({ seg, index, sites, token, canRemove, onUpdate, onPortChange, onRemove }: CardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs font-medium text-gray-400">#{index + 1}</span>
        <select
          value={seg.segmentType}
          onChange={(e) => onUpdate(seg._id, 'segmentType', e.target.value as SegmentType)}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="patch">Patch</option>
          <option value="trunk">Trunk</option>
          <option value="jumper">Jumper</option>
          <option value="demarc_extension">Demarc Ext</option>
        </select>
        <input
          value={seg.physicalCableLabel}
          onChange={(e) => onUpdate(seg._id, 'physicalCableLabel', e.target.value)}
          placeholder="Cable label (e.g. SMF-A-042)"
          className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 font-mono text-xs"
        />
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(seg._id)}
            className="shrink-0 text-xs text-gray-400 hover:text-red-500"
            aria-label="Remove segment"
          >
            X
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-500">From Port</p>
          <PortPickerSelect
            token={token}
            sites={sites}
            portId={seg.fromPortId}
            portLabel={seg.fromPortLabel}
            onChange={(pid, plbl) => onPortChange(seg._id, 'from', pid, plbl)}
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-500">To Port</p>
          <PortPickerSelect
            token={token}
            sites={sites}
            portId={seg.toPortId}
            portLabel={seg.toPortLabel}
            onChange={(pid, plbl) => onPortChange(seg._id, 'to', pid, plbl)}
          />
        </div>
      </div>
    </div>
  );
}
