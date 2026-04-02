'use client';

import { useApiAction } from '@/hooks/use-api-action';
import { orgsApi } from '@/lib/api/organizations';
import type { UserDto } from '@xc/types';
import { useState } from 'react';

interface Props {
  wo: {
    id: string;
    state: string;
    assignedToId: string | null;
  };
  token: string;
  role: string;
  orgId: string;
}

const btnBase = 'rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60';

const ASSIGNABLE_ROLES: UserDto['role'][] = ['ops_technician', 'ops_manager', 'super_admin'];

export function WorkOrderActions({ wo, token, role, orgId }: Props) {
  const { act, apiPatch, busy, error } = useApiAction(token);
  const [showAssign, setShowAssign] = useState(false);
  const [showNotes, setShowNotes] = useState<
    null | 'pending_test' | 'test_failed' | 'complete' | 'cancel'
  >(null);
  const [assignedToId, setAssignedToId] = useState('');
  const [technicians, setTechnicians] = useState<UserDto[]>([]);
  const [techsLoading, setTechsLoading] = useState(false);
  const [techNotes, setTechNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const isOpsManager = ['super_admin', 'ops_manager'].includes(role);
  const isTech = ['super_admin', 'ops_manager', 'ops_technician'].includes(role);

  async function openAssignPanel() {
    setShowAssign(true);
    setTechsLoading(true);
    try {
      const users = await orgsApi.listUsers(token, orgId);
      setTechnicians(users.filter((u) => u.isActive && ASSIGNABLE_ROLES.includes(u.role)));
    } catch {
      // non-critical — panel still opens with empty list
    } finally {
      setTechsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {/* created|assigned → assign (manager only) */}
        {isOpsManager && ['created', 'assigned'].includes(wo.state) && (
          <button
            onClick={openAssignPanel}
            disabled={busy}
            className={`${btnBase} bg-brand-600 text-white hover:bg-brand-700`}
          >
            {wo.assignedToId ? 'Reassign' : 'Assign'}
          </button>
        )}

        {/* assigned → start (tech+) */}
        {isTech && wo.state === 'assigned' && (
          <button
            onClick={() => act(() => apiPatch(`/work-orders/${wo.id}/start`, {}), 'Start')}
            disabled={busy}
            className={`${btnBase} bg-orange-500 text-white hover:bg-orange-600`}
          >
            Start Work
          </button>
        )}

        {/* in_progress → pending_test (tech+) */}
        {isTech && wo.state === 'in_progress' && (
          <button
            onClick={() => setShowNotes('pending_test')}
            disabled={busy}
            className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700`}
          >
            Mark Ready for Test
          </button>
        )}

        {/* pending_test → complete or back to in_progress (tech+) */}
        {/* NOTE: complete is only allowed from pending_test — skipping the test phase is not permitted */}
        {isTech && wo.state === 'pending_test' && (
          <>
            <button
              onClick={() => setShowNotes('complete')}
              disabled={busy}
              className={`${btnBase} bg-green-600 text-white hover:bg-green-700`}
            >
              Complete
            </button>
            <button
              onClick={() => setShowNotes('test_failed')}
              disabled={busy}
              className={`${btnBase} border border-red-300 text-red-600 hover:bg-red-50`}
            >
              Test Failed
            </button>
          </>
        )}

        {/* open|assigned → cancel (manager only) */}
        {isOpsManager && ['created', 'assigned'].includes(wo.state) && (
          <button
            onClick={() => setShowNotes('cancel')}
            disabled={busy}
            className={`${btnBase} border border-gray-300 text-gray-600 hover:bg-gray-50`}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Assign panel */}
      {showAssign && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-brand-700">Assign Work Order</h3>
          <select
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            disabled={techsLoading}
            className="block w-full rounded-md border border-brand-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
          >
            <option value="">
              {techsLoading ? 'Loading technicians…' : '— Select technician —'}
            </option>
            {technicians.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({u.role.replace(/_/g, ' ')})
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              disabled={busy || !assignedToId.trim()}
              onClick={() =>
                act(
                  () =>
                    apiPatch(`/work-orders/${wo.id}/assign`, { assignedToId: assignedToId.trim() }),
                  'Assign',
                ).then(() => {
                  setShowAssign(false);
                  setAssignedToId('');
                })
              }
              className={`${btnBase} bg-brand-600 text-white hover:bg-brand-700`}
            >
              Confirm Assignment
            </button>
            <button
              onClick={() => {
                setShowAssign(false);
                setAssignedToId('');
              }}
              className={`${btnBase} border border-gray-300 text-gray-600 hover:bg-gray-50`}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Notes panel (pending_test, test_failed, complete, cancel) */}
      {showNotes && (
        <div
          className={`rounded-lg border p-4 space-y-3 ${
            showNotes === 'cancel'
              ? 'border-gray-200 bg-gray-50'
              : showNotes === 'test_failed'
                ? 'border-red-200 bg-red-50'
                : showNotes === 'complete'
                  ? 'border-green-200 bg-green-50'
                  : 'border-blue-200 bg-blue-50'
          }`}
        >
          <h3
            className={`text-sm font-semibold ${
              showNotes === 'cancel'
                ? 'text-gray-700'
                : showNotes === 'test_failed'
                  ? 'text-red-700'
                  : showNotes === 'complete'
                    ? 'text-green-700'
                    : 'text-blue-700'
            }`}
          >
            {showNotes === 'pending_test' && 'Mark Ready for Test'}
            {showNotes === 'test_failed' && 'Report Test Failure'}
            {showNotes === 'complete' && 'Complete Work Order'}
            {showNotes === 'cancel' && 'Cancel Work Order'}
          </h3>
          <textarea
            rows={3}
            placeholder={
              showNotes === 'cancel'
                ? 'Cancellation reason (required, min 5 characters)…'
                : 'Tech notes (required)…'
            }
            value={showNotes === 'cancel' ? cancelReason : techNotes}
            onChange={(e) =>
              showNotes === 'cancel'
                ? setCancelReason(e.target.value)
                : setTechNotes(e.target.value)
            }
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
          <div className="flex gap-2">
            <button
              disabled={
                busy ||
                (showNotes === 'cancel' ? cancelReason.trim().length < 5 : techNotes.trim().length < 1)
              }
              onClick={() => {
                const bodyFn = () => {
                  if (showNotes === 'pending_test')
                    return apiPatch(`/work-orders/${wo.id}/pending-test`, {
                      techNotes: techNotes.trim(),
                    });
                  if (showNotes === 'test_failed')
                    return apiPatch(`/work-orders/${wo.id}/test-failed`, {
                      techNotes: techNotes.trim(),
                    });
                  if (showNotes === 'complete')
                    return apiPatch(`/work-orders/${wo.id}/complete`, {
                      techNotes: techNotes.trim(),
                    });
                  return apiPatch(`/work-orders/${wo.id}/cancel`, {
                    cancellationReason: cancelReason.trim(),
                  });
                };
                act(bodyFn, showNotes).then(() => {
                  setShowNotes(null);
                  setTechNotes('');
                  setCancelReason('');
                });
              }}
              className={`${btnBase} ${
                showNotes === 'cancel'
                  ? 'bg-gray-700 text-white hover:bg-gray-800'
                  : showNotes === 'test_failed'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : showNotes === 'complete'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Confirm
            </button>
            <button
              onClick={() => {
                setShowNotes(null);
                setTechNotes('');
                setCancelReason('');
              }}
              className={`${btnBase} border border-gray-300 text-gray-600 hover:bg-gray-50`}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
