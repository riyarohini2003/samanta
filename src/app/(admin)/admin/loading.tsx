export default function AdminLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="relative">
        <div className="h-10 w-10 animate-spin-slow rounded-full border-[3px] border-muted border-t-primary" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-4 rounded-full bg-primary/10 animate-pulse-soft" />
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-muted-foreground animate-pulse-soft">Loading...</p>
    </div>
  );
}
