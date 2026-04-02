export default function PortalServicesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-1">
        <div className="h-7 w-40 rounded bg-gray-200" />
        <div className="h-4 w-24 rounded bg-gray-200" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-40 rounded-md bg-gray-200" />
        <div className="h-9 w-20 rounded-md bg-gray-200" />
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="h-10 border-b border-gray-200 bg-gray-50" />
        <div className="divide-y divide-gray-100">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-6 py-4">
              <div className="h-4 w-28 rounded bg-gray-100" />
              <div className="h-5 w-20 rounded-full bg-gray-100" />
              <div className="h-4 w-12 rounded bg-gray-100" />
              <div className="h-4 w-20 rounded bg-gray-100" />
              <div className="h-4 w-20 rounded bg-gray-100" />
              <div className="h-4 w-24 rounded bg-gray-100" />
              <div className="h-4 w-24 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
