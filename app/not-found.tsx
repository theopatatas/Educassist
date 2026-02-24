export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-zinc-600">The page you’re looking for doesn’t exist.</p>
      </div>
    </div>
  );
}
