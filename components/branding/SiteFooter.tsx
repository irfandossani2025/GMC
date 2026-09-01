import { CLINIC_DEVELOPER_FOOTER } from '@/lib/clinic';

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-5 text-center text-sm text-slate-600">
        {CLINIC_DEVELOPER_FOOTER}
      </div>
    </footer>
  );
}
