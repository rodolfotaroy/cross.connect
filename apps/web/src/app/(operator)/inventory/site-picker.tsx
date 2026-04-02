'use client';

interface Site {
  id: string;
  name: string;
  code: string;
}

export function SitePicker({ sites, selectedId }: { sites: Site[]; selectedId?: string }) {
  return (
    <form method="GET">
      <select
        name="siteId"
        defaultValue={selectedId ?? ''}
        onChange={(e) => e.currentTarget.form?.submit()}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">Select a site…</option>
        {sites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.code})
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="ml-2 rounded-md border px-3 py-2 text-sm">
          Go
        </button>
      </noscript>
    </form>
  );
}
