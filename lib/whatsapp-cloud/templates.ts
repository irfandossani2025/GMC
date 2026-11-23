/**
 * The two message templates to create in Meta WhatsApp Manager.
 * The number of {{n}} values must match what the site sends:
 *  - card:    4 values (name, patient ID, valid until, card link) + an IMAGE header
 *  - session: 6 values (name, treatment, date, used, total, remaining)
 */
export const TEMPLATE_GUIDE = {
  card: {
    defaultName: 'gmc_membership_card',
    category: 'Utility',
    header: 'Image',
    body: [
      'Hello {{1}}, welcome to Grand Medical Care. Your membership card is ready.',
      '',
      'Member ID: {{2}}',
      'Valid until: {{3}}',
      '',
      'View or save your card here: {{4}}',
      '',
      'Please show this card at reception on every visit.',
    ].join('\n'),
    samples: ['Hasan Mahmood', '16569', '16 Nov 2027', 'https://membership.grandmedicalcare.com/card/sample'],
  },
  session: {
    defaultName: 'gmc_session_recorded',
    category: 'Utility',
    header: 'None',
    body: [
      'Hello {{1}}, thank you for visiting Grand Medical Care today.',
      '',
      'Treatment: {{2}}',
      'Date: {{3}}',
      'Sessions used: {{4}} of {{5}}',
      'Sessions remaining: {{6}}',
      '',
      'We look forward to seeing you at your next visit.',
    ].join('\n'),
    samples: ['Hasan Mahmood', 'Laser (Ministries)', '22 Nov 2026', '1', '6', '5'],
  },
} as const;
