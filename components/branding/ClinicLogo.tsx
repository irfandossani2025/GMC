'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';

import { CLINIC_NAME } from '@/lib/clinic';

interface ClinicLogoProps {
  className?: string;
  compact?: boolean;
}

export function ClinicLogo({ className = '', compact = false }: ClinicLogoProps) {
  const { t } = useLanguage();
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <img
        src="/gmc-logo.png"
        alt={t(CLINIC_NAME)}
        className={compact ? 'h-12 w-auto' : 'h-20 w-auto'}
      />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
          {t("Premium Membership")} </p>
        <div className={`font-semibold tracking-[-0.03em] text-slate-900 ${compact ? 'text-lg' : 'text-3xl'}`}>
          {t(CLINIC_NAME)}
        </div>
      </div>
    </div>
  );
}
