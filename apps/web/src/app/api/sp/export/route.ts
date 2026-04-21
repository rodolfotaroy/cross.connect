import { auth } from '@/lib/auth/session';
import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export async function GET(request: Request) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const upstream = `${API_BASE}/sp/reports/cross-connects/export${qs ? `?${qs}` : ''}`;

  const res = await fetch(upstream, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Export failed' }, { status: res.status });
  }

  const body = await res.text();
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="cross-connects.csv"',
    },
  });
}
