export default function PortalOrdersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-7 w-56 rounded bg-gray-200" />
          <div className="h-4 w-32 rounded bg-gray-200" />
        </div>
        <div className="h-9 w-40 rounded-md bg-gray-200" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-44 rounded-md bg-gray-200" />
        <div className="h-9 w-36 rounded-md bg-gray-200" />
        <div className="h-9 w-20 rounded-md bg-gray-200" />
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="h-10 border-b border-gray-200 bg-gray-50" />
        <div className="divide-y divide-gray-100">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-4 py-3">
              <div className="h-4 w-24 rounded bg-gray-100" />
              <div className="h-4 w-20 rounded bg-gray-100" />
              <div className="h-4 w-20 rounded bg-gray-100" />
              <div className="h-5 w-24 rounded-full bg-gray-100" />
              <div className="h-4 w-20 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
