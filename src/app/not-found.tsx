import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 overflow-hidden">
      {/* Background orbs */}
      <div className="orb -top-32 left-1/4 h-[300px] w-[300px] bg-primary/10 animate-float" aria-hidden />
      <div className="orb -bottom-20 right-1/4 h-[250px] w-[250px] bg-sky-400/10 animate-float-slow" aria-hidden />

      <div className="relative text-center">
        <h1 className="text-8xl font-black tracking-tighter text-foreground/10 sm:text-9xl">404</h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Page not found</h2>
        </div>
      </div>
      <p className="mt-6 max-w-md text-center text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.97]"
      >
        Back to Home
      </Link>
    </div>
  );
}
