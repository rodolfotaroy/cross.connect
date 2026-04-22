import { PageHeader } from '@/components/ui/page-header';
import { spSupportApi } from '@/lib/api/sp-support';
import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddCommentForm } from './add-comment-form';
import { UpdateTicketStatusForm } from './update-status-form';

export const metadata: Metadata = { title: 'Ticket — SP Portal' };

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  const role = (session?.user as any)?.role as string;
  const isAdmin = role === 'sp_admin';

  const ticket = await spSupportApi.getTicket(token, id).catch(() => null);
  if (!ticket) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/sp/support"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tickets
        </Link>
      </div>
      <PageHeader
        title={ticket.subject}
        subtitle={`${ticket.category} · ${ticket.priority} priority`}
        actions={isAdmin && <UpdateTicketStatusForm ticketId={id} currentStatus={ticket.status} />}
      />

      {/* Status */}
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[ticket.status] ?? 'bg-gray-100 text-gray-600'}`}
        >
          {ticket.status.replace('_', ' ')}
        </span>
        <span className="text-sm text-gray-500">
          Opened {new Date(ticket.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Description */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Description</h2>
        <p className="whitespace-pre-wrap text-sm text-gray-700">{ticket.description}</p>
      </div>

      {/* Comments */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          Comments ({ticket.comments?.length ?? 0})
        </h2>
        {ticket.comments && ticket.comments.length > 0 ? (
          <div className="space-y-4">
            {ticket.comments.map((c: any) => (
              <div key={c.id} className="rounded-md bg-gray-50 p-4">
                <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                  <span className="font-medium text-gray-600">
                    {c.author?.name ?? c.author?.email ?? 'Unknown'}
                  </span>
                  <span>·</span>
                  <span>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-700">{c.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No comments yet</p>
        )}

        {ticket.status !== 'closed' && (
          <div className="mt-6 border-t border-gray-100 pt-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Add Comment</h3>
            <AddCommentForm ticketId={id} />
          </div>
        )}
      </div>
    </div>
  );
}
