import { CLINIC_NAME } from '@/lib/clinic';

interface ClinicLogoProps {
  className?: string;
  compact?: boolean;
}

export function ClinicLogo({ className = '', compact = false }: ClinicLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <img
        src="/gmc-logo.png"
        alt={CLINIC_NAME}
        className={compact ? 'h-12 w-auto' : 'h-20 w-auto'}
      />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
          Premium Membership
        </p>
        <h1 className={`font-semibold tracking-[-0.03em] text-slate-900 ${compact ? 'text-lg' : 'text-3xl'}`}>
          {CLINIC_NAME}
        </h1>
      </div>
    </div>
  );
}
