import { ConfirmDelete } from '@/components/ui/confirm-delete';
import { PageHeader } from '@/components/ui/page-header';
import { buildingsApi, cagesApi, racksApi, roomsApi, sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';
import { deactivateCage } from './cages/[cageId]/edit/actions';
import { deactivateRack } from './cages/[cageId]/racks/[rackId]/edit/actions';
import { deactivateRoom } from './edit/actions';
import { deactivatePanel } from './panels/[panelId]/edit/actions';
import { deactivateRoomRack } from './racks/[rackId]/edit/actions';

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ siteId: string; buildingId: string; roomId: string }>;
}) {
  const { siteId, buildingId, roomId } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const [site, buildings, room, cages, standaloneRacks] = await Promise.all([
    sitesApi.getOne(token, siteId).catch(() => null),
    buildingsApi.list(token, siteId).catch(() => []),
    roomsApi.getOne(token, roomId).catch(() => null),
    cagesApi.list(token, roomId).catch(() => []),
    racksApi.listByRoom(token, roomId).catch(() => []),
  ]);
  const roomPanels = room?.panels ?? [];

  const building = buildings.find((b) => b.id === buildingId);
  if (!room || !building || !site) notFound();

  // cages already include active racks via listCages (select: id, code, name, uSize)
  // No separate racksApi.list call needed — avoids Prisma selecting roomId before migration

  const baseUrl = `/locations/${siteId}/buildings/${buildingId}/rooms/${roomId}`;

  return (
    <div>
      <PageHeader
        title={room.name}
        subtitle={`${room.roomType.replace(/_/g, ' ')} | ${room.code}`}
        breadcrumb={[
          { label: 'Locations', href: '/locations' },
          { label: site.name, href: `/locations/${siteId}` },
          { label: building.name, href: `/locations/${siteId}/buildings/${buildingId}` },
          { label: room.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/inventory?roomId=${roomId}`}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              Port Inventory
            </Link>
            <Link
              href={`${baseUrl}/edit`}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </Link>
            <ConfirmDelete
              action={deactivateRoom.bind(null, siteId, buildingId, roomId)}
              entityName="room"
              redirectTo={`/locations/${siteId}/buildings/${buildingId}`}
              warning="Requires all cages and panels to be deactivated first."
            />
          </div>
        }
      />

      {/* Cages & Racks */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Cages ({cages.length})</h2>
          <Link
            href={`${baseUrl}/cages/new`}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            + Add Cage
          </Link>
        </div>

        {cages.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
            <p className="text-sm text-gray-500">No cages yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cages.map((cage) => (
              <div key={cage.id} className="rounded-lg border border-gray-200 bg-white">
                <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div>
                    <span className="font-mono text-xs font-semibold text-brand-600">
                      {cage.code}
                    </span>
                    <span className="ml-2 text-sm font-medium text-gray-900">{cage.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`${baseUrl}/cages/${cage.id}/edit`}
                      className="text-xs font-medium text-gray-500 hover:text-brand-600"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`${baseUrl}/cages/${cage.id}/racks/new`}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      + Add Rack
                    </Link>
                    <ConfirmDelete
                      action={deactivateCage.bind(null, baseUrl, cage.id)}
                      entityName="cage"
                      redirectTo={baseUrl}
                      warning="Requires all racks to be deactivated first."
                    />
                  </div>
                </div>

                {cage.racks.length === 0 ? (
                  <p className="px-5 py-3 text-sm text-gray-400">No racks in this cage.</p>
                ) : (
                  <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-2 text-left text-xs font-medium uppercase text-gray-500">
                          Rack
                        </th>
                        <th className="px-5 py-2 text-left text-xs font-medium uppercase text-gray-500">
                          Code
                        </th>
                        <th className="px-5 py-2 text-left text-xs font-medium uppercase text-gray-500">
                          U Size
                        </th>
                        <th className="px-5 py-2 text-right" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cage.racks.map((rack) => (
                        <Fragment key={rack.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-5 py-2 text-gray-900">{rack.name}</td>
                          <td className="px-5 py-2 font-mono text-gray-600">{rack.code}</td>
                          <td className="px-5 py-2 text-gray-600">{rack.uSize}U</td>
                          <td className="px-5 py-2 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <Link
                                href={`${baseUrl}/cages/${cage.id}/racks/${rack.id}/edit`}
                                className="text-xs font-medium text-gray-500 hover:text-brand-600"
                              >
                                Edit
                              </Link>
                              <Link
                                href={`${baseUrl}/cages/${cage.id}/racks/${rack.id}/panels/new`}
                                className="text-xs font-medium text-brand-600 hover:text-brand-700"
                              >
                                + Add Panel
                              </Link>
                              <ConfirmDelete
                                action={deactivateRack.bind(null, baseUrl, rack.id)}
                                entityName="rack"
                                redirectTo={baseUrl}
                                warning="Requires all panels to be deactivated first."
                              />
                            </div>
                          </td>
                        </tr>
                        {rack.panels && rack.panels.length > 0 && (
                          <tr>
                            <td colSpan={4} className="bg-gray-50/60 px-5 pb-2 pt-0">
                              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Panels</p>
                              <table className="w-full text-xs">
                                <tbody>
                                  {rack.panels.map((panel) => (
                                    <tr key={panel.id} className="hover:bg-white/60">
                                      <td className="py-0.5 pr-4">
                                        <span className="font-mono font-semibold text-brand-600">{panel.code}</span>
                                        <span className="ml-1.5 text-gray-700">{panel.name}</span>
                                      </td>
                                      <td className="py-0.5 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                          <Link
                                            href={`${baseUrl}/cages/${cage.id}/racks/${rack.id}/panels/${panel.id}/edit`}
                                            className="text-xs font-medium text-gray-500 hover:text-brand-600"
                                          >
                                            Edit
                                          </Link>
                                          <Link
                                            href={`/inventory?rackId=${rack.id}`}
                                            className="text-xs text-brand-600 hover:underline"
                                          >
                                            Inventory
                                          </Link>
                                          <ConfirmDelete
                                            action={deactivatePanel.bind(null, baseUrl, panel.id)}
                                            entityName="panel"
                                            redirectTo={baseUrl}
                                            warning="Blocked if any ports are in-use or reserved."
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Standalone Racks (not inside a cage) */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Standalone Racks ({standaloneRacks.length})
          </h2>
          <Link
            href={`${baseUrl}/racks/new`}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            + Add Rack
          </Link>
        </div>

        {standaloneRacks.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
            <p className="text-sm text-gray-500">No standalone racks in this room.</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-2 text-left text-xs font-medium uppercase text-gray-500">Rack</th>
                  <th className="px-5 py-2 text-left text-xs font-medium uppercase text-gray-500">Code</th>
                  <th className="px-5 py-2 text-left text-xs font-medium uppercase text-gray-500">U Size</th>
                  <th className="px-5 py-2 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {standaloneRacks.map((rack) => (
                  <Fragment key={rack.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-5 py-2 text-gray-900">{rack.name}</td>
                    <td className="px-5 py-2 font-mono text-gray-600">{rack.code}</td>
                    <td className="px-5 py-2 text-gray-600">{rack.uSize}U</td>
                    <td className="px-5 py-2 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`${baseUrl}/racks/${rack.id}/edit`}
                          className="text-xs font-medium text-gray-500 hover:text-brand-600"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`${baseUrl}/racks/${rack.id}/panels/new`}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700"
                        >
                          + Add Panel
                        </Link>
                        <ConfirmDelete
                          action={deactivateRoomRack.bind(null, baseUrl, rack.id)}
                          entityName="rack"
                          redirectTo={baseUrl}
                          warning="Requires all panels to be deactivated first."
                        />
                      </div>
                    </td>
                  </tr>
                  {rack.panels && rack.panels.length > 0 && (
                    <tr>
                      <td colSpan={4} className="bg-gray-50/60 px-5 pb-2 pt-0">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Panels</p>
                        <table className="w-full text-xs">
                          <tbody>
                            {rack.panels.map((panel) => (
                              <tr key={panel.id} className="hover:bg-white/60">
                                <td className="py-0.5 pr-4">
                                  <span className="font-mono font-semibold text-brand-600">{panel.code}</span>
                                  <span className="ml-1.5 text-gray-700">{panel.name}</span>
                                </td>
                                <td className="py-0.5 text-right">
                                  <div className="flex items-center justify-end gap-3">
                                    <Link
                                      href={`${baseUrl}/racks/${rack.id}/panels/${panel.id}/edit`}
                                      className="text-xs font-medium text-gray-500 hover:text-brand-600"
                                    >
                                      Edit
                                    </Link>
                                    <Link
                                      href={`/inventory?rackId=${rack.id}`}
                                      className="text-xs text-brand-600 hover:underline"
                                    >
                                      Inventory
                                    </Link>
                                    <ConfirmDelete
                                      action={deactivatePanel.bind(null, baseUrl, panel.id)}
                                      entityName="panel"
                                      redirectTo={baseUrl}
                                      warning="Blocked if any ports are in-use or reserved."
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Room-level panels (ODF frames, demarc boards) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Room Panels ({roomPanels.length})
          </h2>
          <Link
            href={`${baseUrl}/panels/new`}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            + Add Panel
          </Link>
        </div>

        {roomPanels.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
            <p className="text-sm text-gray-500">No room-level panels yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500">
                    Ports
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roomPanels.map((panel) => (
                  <tr key={panel.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{panel.name}</td>
                    <td className="px-6 py-3 font-mono text-gray-600">{panel.code}</td>
                    <td className="px-6 py-3 text-gray-600 capitalize">
                      {panel.panelType.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{panel.portCount}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`${baseUrl}/panels/${panel.id}/edit`}
                          className="text-xs font-medium text-gray-500 hover:text-brand-600"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/inventory?roomId=${roomId}`}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          Inventory
                        </Link>
                        <ConfirmDelete
                          action={deactivatePanel.bind(null, baseUrl, panel.id)}
                          entityName="panel"
                          redirectTo={baseUrl}
                          warning="Blocked if any ports are in-use or reserved."
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
