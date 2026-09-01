import { BarcodeSvg } from '@/components/cards/BarcodeSvg';
import { buildCardScanUrl } from '@/lib/card-utils';
import { CLINIC_CONTACT, CLINIC_DEVELOPER_FOOTER, CLINIC_NAME, formatDisplayDate, formatMembershipType } from '@/lib/clinic';

interface MembershipCardPreviewProps {
  side: 'front' | 'back';
  memberName: string;
  memberId: string;
  membershipType: string;
  expiryDate: string;
  barcode: string;
}

export function MembershipCardPreview({
  side,
  memberName,
  memberId,
  membershipType,
  expiryDate,
  barcode,
}: MembershipCardPreviewProps) {
  const cardScanUrl = buildCardScanUrl(barcode);

  if (side === 'front') {
    return (
      <div className="card-print-surface flex flex-col justify-between overflow-hidden rounded-2xl border border-black/20 bg-white p-4 text-black">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/gmc-logo.png" alt={CLINIC_NAME} className="h-10 w-auto brightness-0" />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-black">
                Grand Membership
              </p>
              <h3 className="text-base font-semibold tracking-[-0.03em] text-black">
                {CLINIC_NAME}
              </h3>
            </div>
          </div>
          <span className="rounded-full border border-black px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-black">
            {formatMembershipType(membershipType)}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-[0.26em] text-black">Patient Name</p>
          <p className="text-base font-semibold tracking-[-0.04em] text-black">{memberName}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-black">
            <div className="rounded-xl bg-gray-100 p-2">
              <p className="text-[9px] uppercase tracking-[0.24em] text-black">Member No.</p>
              <p className="mt-0.5 text-xs font-semibold text-black">{memberId}</p>
            </div>
            <div className="rounded-xl bg-gray-100 p-2">
              <p className="text-[9px] uppercase tracking-[0.24em] text-black">Valid Until</p>
              <p className="mt-0.5 text-xs font-semibold text-black">{formatDisplayDate(expiryDate)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.24em] text-black">Clinic Standard</p>
            <p className="text-[9px] text-black">Premium medical and cosmetic care</p>
          </div>
          <p className="text-[8px] font-medium text-black">{CLINIC_DEVELOPER_FOOTER}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-black/20 bg-white p-4 text-black card-print-back">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-black">Card Verification</p>
          <h3 className="mt-0.5 text-sm font-semibold tracking-[-0.03em] text-black">{CLINIC_NAME}</h3>
        </div>
        <img src="/gmc-logo.png" alt={CLINIC_NAME} className="h-10 w-auto brightness-0" />
      </div>

      <div className="rounded-xl border border-black/20 bg-white px-3 py-2">
        <BarcodeSvg value={cardScanUrl} className="h-[58px] w-full" color="#000000" />
        <p className="mt-1 text-center font-mono text-[8px] tracking-[0.18em] text-black">{barcode}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[9px] uppercase tracking-[0.24em] text-black">Member No.</p>
          <p className="mt-0.5 text-xs font-semibold text-black">{memberId}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-[0.24em] text-black">Expiry Date</p>
          <p className="mt-0.5 text-xs font-semibold text-black">{formatDisplayDate(expiryDate)}</p>
        </div>
      </div>

      <div className="space-y-0.5 text-[9px] text-black">
        <p>{CLINIC_CONTACT.phone}</p>
        <p>{CLINIC_CONTACT.email}</p>
        <p>{CLINIC_CONTACT.address}</p>
      </div>

      <div className="pt-1 text-[8px] font-medium text-black">
        {CLINIC_DEVELOPER_FOOTER}
      </div>
    </div>
  );
}
