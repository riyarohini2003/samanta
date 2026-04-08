export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="relative">
        <div className="h-12 w-12 animate-spin-slow rounded-full border-[3px] border-muted border-t-primary" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-5 rounded-full bg-primary/10 animate-pulse-soft" />
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse-soft">Loading...</p>
    </div>
  );
}
