'use client';

import { useApiAction } from '@/hooks/use-api-action';
import { useState } from 'react';

const btnBase = 'rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60';

interface Props {
  svc: {
    id: string;
    state: string;
    isTemporary: boolean;
    expiresAt: string | null;
  };
  token: string;
  role: string;
}

export function ServiceActions({ svc, token, role }: Props) {
  const { act, apiPatch, busy, error, setError } = useApiAction(token);
  const [panel, setPanel] = useState<
    null | 'suspend' | 'resume' | 'disconnect' | 'abort' | 'extend'
  >(null);
  const [reason, setReason] = useState('');
  const [newExpiry, setNewExpiry] = useState('');

  const isManager = ['super_admin', 'ops_manager'].includes(role);
  const isCustomerAdmin = role === 'customer_admin' || role === 'customer_orderer';

  function closePanel() {
    setPanel(null);
    setReason('');
    setNewExpiry('');
  }

  const noActions = !['provisioning', 'active', 'suspended', 'pending_disconnect'].includes(
    svc.state,
  );

  if (noActions && svc.state !== 'provisioning') return null;

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {/* active → suspend (manager only) */}
        {isManager && svc.state === 'active' && (
          <button
            onClick={() => setPanel('suspend')}
            disabled={busy}
            className={`${btnBase} bg-yellow-500 text-white hover:bg-yellow-600`}
          >
            Suspend
          </button>
        )}

        {/* suspended → active (manager only) */}
        {isManager && svc.state === 'suspended' && (
          <button
            onClick={() => act(() => apiPatch(`/services/${svc.id}/resume`, {}), 'Resume')}
            disabled={busy}
            className={`${btnBase} bg-green-600 text-white hover:bg-green-700`}
          >
            Resume Service
          </button>
        )}

        {/* active → pending_disconnect (manager or customer_admin) */}
        {(isManager || isCustomerAdmin) && svc.state === 'active' && (
          <button
            onClick={() => setPanel('disconnect')}
            disabled={busy}
            className={`${btnBase} border border-red-300 text-red-600 hover:bg-red-50`}
          >
            Request Disconnect
          </button>
        )}

        {/* provisioning → disconnected (manager only) */}
        {isManager && svc.state === 'provisioning' && (
          <button
            onClick={() => setPanel('abort')}
            disabled={busy}
            className={`${btnBase} border border-gray-300 text-gray-600 hover:bg-gray-50`}
          >
            Abort Provisioning
          </button>
        )}

        {/* Extend expiry for temporary services (manager or customer_admin) */}
        {(isManager || isCustomerAdmin) && svc.isTemporary && svc.state === 'active' && (
          <button
            onClick={() => setPanel('extend')}
            disabled={busy}
            className={`${btnBase} border border-brand-300 text-brand-600 hover:bg-brand-50`}
          >
            Extend Expiry
          </button>
        )}
      </div>

      {/* Suspend panel */}
      {panel === 'suspend' && (
        <ConfirmPanel
          title="Suspend Service"
          titleColor="text-yellow-700"
          borderColor="border-yellow-200"
          bgColor="bg-yellow-50"
          confirmLabel="Suspend"
          confirmClass={`${btnBase} bg-yellow-500 text-white hover:bg-yellow-600`}
          busy={busy}
          onClose={closePanel}
          onConfirm={() =>
            act(
              () =>
                apiPatch(`/services/${svc.id}/suspend`, {
                  reason: reason || 'Suspended by operator',
                }),
              'Suspend',
            ).then(closePanel)
          }
        >
          <textarea
            rows={2}
            placeholder="Reason (optional)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="block w-full rounded-md border border-yellow-300 px-3 py-2 text-sm focus:outline-none"
          />
        </ConfirmPanel>
      )}

      {/* Disconnect panel */}
      {panel === 'disconnect' && (
        <ConfirmPanel
          title="Request Disconnection"
          titleColor="text-red-700"
          borderColor="border-red-200"
          bgColor="bg-red-50"
          confirmLabel="Request Disconnect"
          confirmClass={`${btnBase} bg-red-600 text-white hover:bg-red-700`}
          busy={busy}
          onClose={closePanel}
          onConfirm={() =>
            act(
              () =>
                apiPatch(`/services/${svc.id}/disconnect`, {
                  reason: reason || 'Disconnect requested',
                }),
              'Disconnect',
            ).then(closePanel)
          }
        >
          <p className="text-xs text-red-600 mb-2">
            This will move the service to <strong>pending_disconnect</strong> state. A work order
            will be needed to physically decommission.
          </p>
          <textarea
            rows={2}
            placeholder="Reason for disconnection…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="block w-full rounded-md border border-red-300 px-3 py-2 text-sm focus:outline-none"
          />
        </ConfirmPanel>
      )}

      {/* Abort provisioning panel */}
      {panel === 'abort' && (
        <ConfirmPanel
          title="Abort Provisioning"
          titleColor="text-gray-700"
          borderColor="border-gray-200"
          bgColor="bg-gray-50"
          confirmLabel="Abort"
          confirmClass={`${btnBase} bg-gray-700 text-white hover:bg-gray-800`}
          busy={busy}
          onClose={closePanel}
          onConfirm={() =>
            act(
              () =>
                apiPatch(`/services/${svc.id}/abort-provisioning`, {
                  reason: reason || 'Provisioning aborted',
                }),
              'Abort',
            ).then(closePanel)
          }
        >
          <textarea
            rows={2}
            placeholder="Reason (min 5 chars)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none"
          />
        </ConfirmPanel>
      )}

      {/* Extend expiry panel */}
      {panel === 'extend' && (
        <ConfirmPanel
          title="Extend Service Expiry"
          titleColor="text-brand-700"
          borderColor="border-brand-200"
          bgColor="bg-brand-50"
          confirmLabel="Extend"
          confirmClass={`${btnBase} bg-brand-600 text-white hover:bg-brand-700`}
          busy={busy}
          onClose={closePanel}
          onConfirm={() => {
            if (!newExpiry) {
              setError('Please select a new expiry date');
              return;
            }
            act(
              () =>
                apiPatch(`/services/${svc.id}/extend`, {
                  newExpiresAt: new Date(newExpiry).toISOString(),
                }),
              'Extend',
            ).then(closePanel);
          }}
        >
          <div className="space-y-2">
            {svc.expiresAt && (
              <p className="text-xs text-gray-500">
                Current expiry: {new Date(svc.expiresAt).toLocaleDateString()}
              </p>
            )}
            <input
              type="date"
              value={newExpiry}
              onChange={(e) => setNewExpiry(e.target.value)}
              className="block w-full rounded-md border border-brand-300 px-3 py-2 text-sm focus:outline-none"
            />
          </div>
        </ConfirmPanel>
      )}
    </div>
  );
}

function ConfirmPanel({
  title,
  titleColor,
  borderColor,
  bgColor,
  confirmLabel,
  confirmClass,
  busy,
  onClose,
  onConfirm,
  children,
}: {
  title: string;
  titleColor: string;
  borderColor: string;
  bgColor: string;
  confirmLabel: string;
  confirmClass: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-4 space-y-3`}>
      <h3 className={`text-sm font-semibold ${titleColor}`}>{title}</h3>
      {children}
      <div className="flex gap-2">
        <button disabled={busy} onClick={onConfirm} className={confirmClass}>
          {confirmLabel}
        </button>
        <button
          onClick={onClose}
          className="rounded-md px-4 py-2 text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          Back
        </button>
      </div>
    </div>
  );
}
