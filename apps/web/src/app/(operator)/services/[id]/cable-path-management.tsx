'use client';

import { cablePathsApi } from '@/lib/api/topology';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PlanCablePathForm } from './plan-cable-path-form';

function formatPortLocation(port: any): string {
  if (!port) return '—';
  const panel = port.panel;
  if (!panel) return port.label ?? '?';

  const parts: string[] = [];

  // Resolve room: rack-mounted (via cage or directly) or panel direct-mount
  let room: any = null;
  if (panel.rack) {
    room = panel.rack.room ?? panel.rack.cage?.room ?? null;
  } else {
    room = panel.room ?? null;
  }

  const site = room?.building?.site;
  if (site) parts.push(site.code);
  if (room) parts.push(room.code);
  if (panel.rack) parts.push(panel.rack.code);
  parts.push(panel.code);
  parts.push(port.label);

  return parts.join(' › ');
}

const btnBase = 'rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60';

interface Props {
  serviceId: string;
  cablePaths: any[];
  token: string;
  role: string;
}

const PATH_STATE_CLS: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-600',
  installed: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  rerouting: 'bg-yellow-100 text-yellow-800',
  decommissioned: 'bg-gray-200 text-gray-400',
};

export function CablePathManagement({ serviceId, cablePaths, token, role }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null); // pathId being acted on
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const isManager = ['super_admin', 'ops_manager'].includes(role);
  const isTech = ['super_admin', 'ops_manager', 'ops_technician'].includes(role);
  // Max 2 paths (primary + diverse); only count non-decommissioned paths
  const canAddPath = isManager && cablePaths.filter((p: any) => p.state !== 'decommissioned').length < 2;

  async function act(pathId: string, fn: () => Promise<unknown>, label: string) {
    setBusy(pathId);
    setError('');
    try {
      await fn();
      router.refresh();
    } catch (e: unknown) {
      const body = (e as any)?.body;
      setError(
        Array.isArray(body?.message)
          ? body.message.join(', ')
          : ((e instanceof Error ? e.message : undefined) ?? `${label} failed`),
      );
    } finally {
      setBusy(null);
    }
  }

  if (cablePaths.length === 0 && !isManager) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Cable Paths</h2>
        {canAddPath && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700`}
          >
            Plan Cable Path
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-4">
          <PlanCablePathForm
            serviceId={serviceId}
            token={token}
            onCreated={() => { setShowForm(false); router.refresh(); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {cablePaths.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
          <p className="text-sm text-gray-400">No cable paths planned yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cablePaths.map((path: any) => (
            <div key={path.id} className="rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium capitalize text-gray-700">
                    {path.pathRole?.replace(/_/g, ' ')} path
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PATH_STATE_CLS[path.state] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {path.state}
                  </span>
                </div>

                {/* State-transition buttons */}
                <div className="flex gap-2">
                  {/* planned → installed (tech+) */}
                  {isTech && path.state === 'planned' && (() => {
                    const allLabelled = path.segments?.every((s: any) => Boolean(s.physicalCableLabel));
                    return (
                      <button
                        disabled={busy === path.id || !allLabelled}
                        title={!allLabelled ? 'Add a cable label to every segment before marking installed' : undefined}
                        onClick={() =>
                          act(
                            path.id,
                            () => cablePathsApi.markInstalled(token, serviceId, path.id),
                            'Mark Installed',
                          )
                        }
                        className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700`}
                      >
                        Mark Installed
                      </button>
                    );
                  })()}

                  {/* installed → active (manager only) */}
                  {isManager && path.state === 'installed' && (
                    <button
                      disabled={busy === path.id}
                      onClick={() =>
                        act(
                          path.id,
                          () => cablePathsApi.activate(token, serviceId, path.id),
                          'Activate',
                        )
                      }
                      className={`${btnBase} bg-green-600 text-white hover:bg-green-700`}
                    >
                      Activate
                    </button>
                  )}

                  {/* active → rerouting (manager only) */}
                  {isManager && path.state === 'active' && (
                    <button
                      disabled={busy === path.id}
                      onClick={() =>
                        act(
                          path.id,
                          () => cablePathsApi.initiateReroute(token, serviceId, path.id),
                          'Initiate Reroute',
                        )
                      }
                      className={`${btnBase} border border-yellow-400 bg-yellow-50 text-yellow-700 hover:bg-yellow-100`}
                    >
                      Initiate Reroute
                    </button>
                  )}

                  {/* active/installed → decommission (manager only) */}
                  {isManager && ['active', 'installed', 'planned'].includes(path.state) && (
                    <button
                      disabled={busy === path.id}
                      onClick={() =>
                        act(
                          path.id,
                          () => cablePathsApi.decommission(token, serviceId, path.id),
                          'Decommission',
                        )
                      }
                      className={`${btnBase} border border-gray-300 text-gray-600 hover:bg-gray-50`}
                    >
                      Decommission
                    </button>
                  )}
                </div>
              </div>

              {/* Segments */}
              {path.segments?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-500 font-medium">#</th>
                        <th className="px-4 py-2 text-left text-gray-500 font-medium">From Port</th>
                        <th className="px-4 py-2 text-left text-gray-500 font-medium">To Port</th>
                        <th className="px-4 py-2 text-left text-gray-500 font-medium">Type</th>
                        <th className="px-4 py-2 text-left text-gray-500 font-medium">
                          Cable Label
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {path.segments.map((seg: any) => (
                        <tr key={seg.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-500">{seg.sequence}</td>
                          <td className="px-4 py-2 font-mono text-gray-700">
                            {seg.fromPort
                              ? formatPortLocation(seg.fromPort)
                              : seg.fromPortId.slice(0, 8) + '…'}
                          </td>
                          <td className="px-4 py-2 font-mono text-gray-700">
                            {seg.toPort
                              ? formatPortLocation(seg.toPort)
                              : seg.toPortId.slice(0, 8) + '…'}
                          </td>
                          <td className="px-4 py-2 capitalize text-gray-600">{seg.segmentType}</td>
                          <td className="px-4 py-2 text-gray-600">{seg.physicalCableLabel ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-4 py-3 text-sm text-gray-400">No segments recorded.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
