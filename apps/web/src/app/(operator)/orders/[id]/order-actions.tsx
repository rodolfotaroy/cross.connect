'use client';

import { useApiAction } from '@/hooks/use-api-action';
import { ordersApi } from '@/lib/api/cross-connects';
import type { CrossConnectOrderDto } from '@xc/types';
import { useState } from 'react';

interface Props {
  order: CrossConnectOrderDto;
  token: string;
}

export function OrderActions({ order, token }: Props) {
  const { act, apiPatch, busy, error } = useApiAction(token);
  const [showReject, setShowReject] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showFeasibility, setShowFeasibility] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [reason, setReason] = useState('');
  const [feasibilityNotes, setFeasibilityNotes] = useState('');
  const [approveNotes, setApproveNotes] = useState('');

  const btnBase = 'rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60';

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {/* draft → submitted */}
        {order.state === 'draft' && (
          <button
            onClick={() => act(() => ordersApi.submit(token, order.id), 'Submit')}
            disabled={busy}
            className={`${btnBase} bg-brand-600 text-white hover:bg-brand-700`}
          >
            Submit for Review
          </button>
        )}

        {/* submitted → under_review */}
        {order.state === 'submitted' && (
          <button
            onClick={() => act(() => apiPatch(`/orders/${order.id}/review`, {}), 'Start Review')}
            disabled={busy}
            className={`${btnBase} bg-orange-500 text-white hover:bg-orange-600`}
          >
            Start Feasibility Review
          </button>
        )}

        {/* under_review → pending_approval (confirm feasibility) */}
        {order.state === 'under_review' && (
          <button
            onClick={() => setShowFeasibility(true)}
            disabled={busy}
            className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700`}
          >
            Confirm Feasibility
          </button>
        )}

        {/* pending_approval → approved */}
        {order.state === 'pending_approval' && (
          <button
            onClick={() => setShowApprove(true)}
            disabled={busy}
            className={`${btnBase} bg-green-600 text-white hover:bg-green-700`}
          >
            Approve
          </button>
        )}

        {order.state === 'pending_approval' && (
          <button
            onClick={() => setShowReject(true)}
            disabled={busy}
            className={`${btnBase} border border-red-300 text-red-600 hover:bg-red-50`}
          >
            Reject
          </button>
        )}

        {order.state !== 'cancelled' &&
          order.state !== 'rejected' &&
          order.state !== 'approved' && (
            <button
              onClick={() => setShowCancel(true)}
              disabled={busy}
              className={`${btnBase} border border-gray-300 text-gray-600 hover:bg-gray-50`}
            >
              Cancel
            </button>
          )}
      </div>

      {/* Confirm Feasibility panel */}
      {showFeasibility && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-blue-700">Confirm Feasibility</h3>
          <p className="text-xs text-blue-600">
            Confirming feasibility moves the order to the Approvals Queue.
          </p>
          <textarea
            rows={3}
            placeholder="Technical notes (optional)…"
            value={feasibilityNotes}
            onChange={(e) => setFeasibilityNotes(e.target.value)}
            className="block w-full rounded-md border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() =>
                act(
                  () =>
                    apiPatch(`/orders/${order.id}/feasibility`, {
                      notes: feasibilityNotes || undefined,
                    }),
                  'Confirm Feasibility',
                ).then(() => {
                  setShowFeasibility(false);
                  setFeasibilityNotes('');
                })
              }
              disabled={busy}
              className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700`}
            >
              Confirm &amp; Send to Approval
            </button>
            <button
              onClick={() => {
                setShowFeasibility(false);
                setFeasibilityNotes('');
              }}
              className={`${btnBase} border border-gray-300 text-gray-600 hover:bg-gray-50`}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Approve panel */}
      {showApprove && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-green-700">Approve Order</h3>
          <textarea
            rows={3}
            placeholder="Approval notes (optional)…"
            value={approveNotes}
            onChange={(e) => setApproveNotes(e.target.value)}
            className="block w-full rounded-md border border-green-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() =>
                act(
                  () => ordersApi.approve(token, order.id, approveNotes || undefined),
                  'Approve',
                ).then(() => {
                  setShowApprove(false);
                  setApproveNotes('');
                })
              }
              disabled={busy}
              className={`${btnBase} bg-green-600 text-white hover:bg-green-700`}
            >
              Confirm Approval
            </button>
            <button
              onClick={() => {
                setShowApprove(false);
                setApproveNotes('');
              }}
              className={`${btnBase} border border-gray-300 text-gray-600 hover:bg-gray-50`}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Reject panel */}
      {showReject && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-red-700">Reject this order</h3>
          <textarea
            rows={3}
            placeholder="Reason for rejection (min 10 characters)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="block w-full rounded-md border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() =>
                act(() => ordersApi.reject(token, order.id, reason), 'Reject').then(() => {
                  setShowReject(false);
                  setReason('');
                })
              }
              disabled={busy || reason.length < 10}
              className={`${btnBase} bg-red-600 text-white hover:bg-red-700`}
            >
              Confirm Rejection
            </button>
            <button
              onClick={() => {
                setShowReject(false);
                setReason('');
              }}
              className={`${btnBase} border border-gray-300 text-gray-600 hover:bg-gray-50`}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Cancel panel */}
      {showCancel && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Cancel this order</h3>
          <textarea
            rows={3}
            placeholder="Reason for cancellation…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() =>
                act(() => ordersApi.cancel(token, order.id, reason || undefined), 'Cancel').then(
                  () => {
                    setShowCancel(false);
                    setReason('');
                  },
                )
              }
              disabled={busy}
              className={`${btnBase} bg-gray-700 text-white hover:bg-gray-800`}
            >
              Confirm Cancellation
            </button>
            <button
              onClick={() => {
                setShowCancel(false);
                setReason('');
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
