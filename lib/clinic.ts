export const CLINIC_NAME = 'Grand Medical Care';
export const CLINIC_DEVELOPER_FOOTER = 'Developed by Irfan & Hasnain';

export const CLINIC_CONTACT = {
  phone: process.env.NEXT_PUBLIC_CLINIC_PHONE || '+968 7177 3333',
  email: process.env.NEXT_PUBLIC_CLINIC_EMAIL || 'marketing@grandmedicalcare.com',
  address: process.env.NEXT_PUBLIC_CLINIC_ADDRESS || 'Grand Medical Care, Oman',
};

export function formatDisplayDate(value?: string | Date | null): string {
  if (!value) {
    return 'N/A';
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatMembershipType(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
