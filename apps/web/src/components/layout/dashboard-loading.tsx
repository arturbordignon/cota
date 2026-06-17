export function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="h-8 w-56 animate-pulse rounded-md bg-outline/30" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded-md bg-outline/20" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-outline/30 bg-white p-5">
            <div className="h-4 w-24 animate-pulse rounded bg-outline/20" />
            <div className="mt-5 h-8 w-32 animate-pulse rounded bg-outline/30" />
            <div className="mt-3 h-3 w-40 animate-pulse rounded bg-outline/20" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-outline/30 bg-white p-6">
        <div className="h-5 w-48 animate-pulse rounded bg-outline/30" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-md bg-outline/10" />
          ))}
        </div>
      </div>
    </div>
  );
}
