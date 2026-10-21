import { BarcodeSvg } from '@/components/cards/BarcodeSvg';
import { buildCardScanUrl } from '@/lib/card-utils';
import { CLINIC_CONTACT, CLINIC_NAME, formatDisplayDate, formatMembershipType } from '@/lib/clinic';

interface MembershipCardPreviewProps {
  side: 'front' | 'back';
  memberName: string;
  memberId: string;
  membershipType: string;
  expiryDate: string;
  barcode: string;
}

export function MembershipCardPreview({ side, memberName, memberId, membershipType, expiryDate, barcode }: MembershipCardPreviewProps) {
  const nameSize = memberName.length > 70 ? 9 : memberName.length > 35 ? 11 : 14;
  const logo = <img src="/gmc-logo.png" alt={CLINIC_NAME} className="membership-card-logo" />;
  const details = <div className="membership-card-details">
    <div><p className="membership-card-label">Member No.</p><p className="membership-card-value">{memberId}</p></div>
    <div><p className="membership-card-label">{side === 'front' ? 'Valid Until' : 'Expiry Date'}</p><p className="membership-card-value">{formatDisplayDate(expiryDate)}</p></div>
  </div>;

  if (side === 'front') return <div className="membership-card card-print-surface membership-card-front">
    <div className="membership-card-header">
      {logo}
      <div className="membership-card-brand"><p className="membership-card-label">Grand Membership</p><h3>{CLINIC_NAME}</h3></div>
      <span className="membership-card-tier">{formatMembershipType(membershipType)}</span>
    </div>
    <div className="membership-card-identity"><p className="membership-card-label">Patient Name</p><p className="membership-card-name" style={{ fontSize: nameSize }}>{memberName}</p></div>
    {details}
    <div className="membership-card-footer"><p>Premium medical and cosmetic care</p></div>
  </div>;

  return <div className="membership-card card-print-back membership-card-back">
    <div className="membership-card-header">{logo}<div className="membership-card-brand"><p className="membership-card-label">Card Verification</p><h3>{CLINIC_NAME}</h3></div></div>
    <div className="membership-card-code">
      <BarcodeSvg value={buildCardScanUrl(barcode)} className="membership-card-barcode" color="#FFFFFF" backgroundColor="#0B1F3A" preserveAspectRatio="none" />
      <p className="membership-card-token">{barcode}</p>
    </div>
    {details}
    <div className="membership-card-contact"><p>{CLINIC_CONTACT.phone}</p><p>{CLINIC_CONTACT.email}</p><p>{CLINIC_CONTACT.address}</p></div>
  </div>;
}
