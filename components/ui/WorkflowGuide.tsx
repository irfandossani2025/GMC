'use client';
import { useLanguage } from '@/components/i18n/LanguageProvider';
const guides: Record<string, string[]> = {
  overview: ['Use quick actions to register a patient or scan a membership card.', 'Review memberships due for renewal before opening a patient profile.'],
  patients: ['Search by patient name, phone number or member ID.', 'Use membership status to narrow the list, then open the patient profile.'],
  registration: ['Enter the patient details and choose the membership expiry date.', 'Choose the purchased treatment package, review the selection, then create the patient.'],
  scan: ['Scan a barcode or enter the membership number manually.', 'Check the patient and package balance, then review and confirm one session.'],
  treatments: ['Review the available treatments and package prices.', 'Complete the new package form to add another option for patient registration.'],
  cards: ['Find the membership card and open the associated patient.', 'Use Export PDF in the patient profile to print both sides.'],
  sessions: ['Choose a status and date range, then select Search.', 'Clear filters to return to the complete session history.'],
  reports: ['Review membership and session totals for clinic activity.', 'Open a patient from the renewal list to review their membership.'],
  staff: ['Add or edit staff accounts and choose the appropriate access level.', 'Deactivate accounts when access is no longer needed.'],
  email: ['Save the SMTP server and sender details supplied by the email provider.', 'Verify the connection, then send a test email to an address you control.'],
  profile: ['Review the patient details, package balances and card status.', 'Add a package or export the membership card using the relevant action.'],
};
export function WorkflowGuide({page}: {page: string}) {
  const {t} = useLanguage();
  return <details className="workflow-guide no-print"><summary>{t('Help with this page')}</summary><ol>{(guides[page] || guides.overview).map(step=><li key={step}>{t(step)}</li>)}</ol></details>;
}
