// Phase 1 placeholder. Routing, layouts, auth and the landing page arrive in Phase 5.
export const DISCLAIMER =
  "This tool provides general support only. It is not a medical diagnosis or a substitute for professional care.";

export default function App() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <main id="main" className="mx-auto max-w-2xl p-8">
        <h1 className="text-3xl font-bold text-brand">Mental Health Companion</h1>
        <p className="mt-2 text-slate-600">Foundation ready. UI is built in Phase 5.</p>
        <p className="mt-6 rounded-2xl bg-brand-tint p-4 text-sm shadow-soft">{DISCLAIMER}</p>
      </main>
    </>
  );
}
