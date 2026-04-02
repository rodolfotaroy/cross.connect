import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Badge, PortStateBadge } from '@/components/ui/status-badge';
import type { PanelWithAvailability } from '@/lib/api/inventory';
import { inventoryApi } from '@/lib/api/inventory';
import { cagesApi, racksApi, roomsApi, sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import type { PortDto } from '@xc/types';
import Link from 'next/link';
import { SitePicker } from './site-picker';

// ─── Panel with ports component ──────────────────────────────────────────────

async function PanelSection({ panel, token }: { panel: PanelWithAvailability; token: string }) {
  const ports = await inventoryApi.listPorts(token, panel.id).catch((): PortDto[] => []);

  const avail = panel.availability;
  const total = avail?.total ?? ports.length;
  const available = avail?.available ?? ports.filter((p) => p.state === 'available').length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
        <div className="flex items-center gap-3">
          <div>
            <span className="font-mono text-xs text-gray-500">{panel.code}</span>
            <h4 className="font-medium text-gray-900">{panel.name}</h4>
          </div>
          <Badge label={panel.panelType.replace(/_/g, ' ')} variant="info" />
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>
            <span className="font-semibold text-green-600">{available}</span>
            <span className="text-gray-400"> / {total} available</span>
          </span>
        </div>
      </div>

      {ports.length === 0 ? (
        <p className="px-6 py-4 text-sm text-gray-400">No ports provisioned.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium uppercase text-gray-500">Label</th>
                <th className="px-4 py-2 text-left font-medium uppercase text-gray-500">Media</th>
                <th className="px-4 py-2 text-left font-medium uppercase text-gray-500">
                  Connector
                </th>
                <th className="px-4 py-2 text-left font-medium uppercase text-gray-500">Strand</th>
                <th className="px-4 py-2 text-left font-medium uppercase text-gray-500">State</th>
                <th className="px-4 py-2 text-left font-medium uppercase text-gray-500">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ports.map((port) => (
                <tr
                  key={port.id}
                  className={
                    port.state === 'available'
                      ? 'bg-green-50/30'
                      : port.state === 'faulty'
                        ? 'bg-red-50/40'
                        : ''
                  }
                >
                  <td className="px-4 py-2 font-mono font-semibold text-gray-900">{port.label}</td>
                  <td className="px-4 py-2 font-mono text-gray-700">{port.mediaType.toUpperCase()}</td>
                  <td className="px-4 py-2 font-mono text-gray-700">{port.connectorType.toUpperCase()}</td>
                  <td className="px-4 py-2 text-gray-500">{port.strandRole || '—'}</td>
                  <td className="px-4 py-2">
                    <PortStateBadge state={port.state} />
                  </td>
                  <td className="px-4 py-2 text-gray-500 max-w-xs truncate">{port.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main inventory page ──────────────────────────────────────────────────────

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ siteId?: string; roomId?: string; rackId?: string; panelId?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const sites = await sitesApi.list(token).catch(() => []);

  // If a specific room is selected, show its cage/rack/panel/port tree
  let panels: PanelWithAvailability[] = [];
  let roomName = '';

  if (sp.roomId) {
    const [roomPanels, rackPanels] = await Promise.all([
      inventoryApi.listRoomPanels(token, sp.roomId).catch((): PanelWithAvailability[] => []),
      // Fetch rack panels: cage racks + standalone racks
      (async () => {
        const [cages, standaloneRacks] = await Promise.all([
          cagesApi.list(token, sp.roomId!).catch(() => []),
          racksApi.listByRoom(token, sp.roomId!).catch(() => []),
        ]);
        const allRackPanels: PanelWithAvailability[] = [];
        for (const cage of cages) {
          const racks = await racksApi.list(token, cage.id).catch(() => []);
          for (const rack of racks) {
            const rp = await inventoryApi
              .listRackPanels(token, rack.id)
              .catch((): PanelWithAvailability[] => []);
            allRackPanels.push(...rp);
          }
        }
        for (const rack of standaloneRacks) {
          const rp = await inventoryApi
            .listRackPanels(token, rack.id)
            .catch((): PanelWithAvailability[] => []);
          allRackPanels.push(...rp);
        }
        return allRackPanels;
      })(),
    ]);
    panels = [...roomPanels, ...rackPanels];
    const room = await roomsApi.getOne(token, sp.roomId).catch(() => null);
    roomName = room ? `${room.name} (${room.code})` : sp.roomId;
  } else if (sp.rackId) {
    panels = await inventoryApi
      .listRackPanels(token, sp.rackId)
      .catch((): PanelWithAvailability[] => []);
  } else if (sp.panelId) {
    const avail = await inventoryApi.getAvailability(token, sp.panelId).catch(() => null);
    panels = [
      {
        id: sp.panelId,
        name: sp.panelId,
        code: sp.panelId,
        panelType: 'patch_panel' as any,
        portCount: 0,
        uPosition: null,
        rackId: null,
        roomId: null,
        availability: avail ?? undefined,
      },
    ];
  }

  // Site availability summary
  let siteAvailability = null;
  if (sp.siteId) {
    siteAvailability = await inventoryApi.getSiteAvailability(token, sp.siteId).catch(() => null);
  }

  const currentSite = sites.find((s) => s.id === sp.siteId);

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Panel and port availability across the datacenter"
        breadcrumb={
          sp.roomId
            ? [{ label: 'Inventory', href: '/inventory' }, { label: roomName || sp.roomId }]
            : sp.rackId
              ? [{ label: 'Inventory', href: '/inventory' }, { label: 'Rack' }]
              : undefined
        }
      />

      {/* Site picker */}
      <div className="mb-6 flex flex-wrap gap-3">
        <SitePicker sites={sites} selectedId={sp.siteId} />

        {sp.siteId && (
          <Link
            href={`/locations/${sp.siteId}`}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            View Site Hierarchy
          </Link>
        )}
      </div>

      {/* Site capacity summary */}
      {siteAvailability && (
        <div className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            {currentSite?.name} — Port Availability by Room
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(siteAvailability as any).rooms?.map((room: any) => (
              <Link
                key={room.roomId}
                href={`/inventory?roomId=${room.roomId}`}
                className="group rounded-lg border border-gray-200 bg-white p-4 hover:border-brand-400 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-500 uppercase">{room.roomCode}</span>
                  <span
                    className={`text-xs font-medium ${
                      room.roomType === 'mmr' ? 'text-purple-600' : 'text-gray-500'
                    }`}
                  >
                    {room.roomType.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-1 font-medium text-gray-900">{room.roomName}</p>
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <span className="text-green-600 font-semibold">{room.available}</span>
                  <span className="text-gray-400 text-xs">/ {room.total} ports free</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-green-400"
                    style={{
                      width: `${room.total > 0 ? Math.round((room.available / room.total) * 100) : 0}%`,
                    }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Panel detail */}
      {(sp.roomId || sp.rackId) && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">
              {sp.roomId ? `Panels in ${roomName}` : `Rack panels`}
            </h2>
            <span className="text-sm text-gray-500">({panels.length} panels)</span>
          </div>

          {panels.length === 0 ? (
            <EmptyState
              title="No panels found"
              description="No panels have been provisioned in this location."
            />
          ) : (
            <div className="space-y-4">
              {panels.map((panel) => (
                <PanelSection key={panel.id} panel={panel} token={token} />
              ))}
            </div>
          )}
        </div>
      )}

      {!sp.siteId && !sp.roomId && !sp.rackId && (
        <EmptyState
          title="Select a site to view inventory"
          description="Choose a site from the dropdown above to see port availability and panel details."
        />
      )}
    </div>
  );
}
