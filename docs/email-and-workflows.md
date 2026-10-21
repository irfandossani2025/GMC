# Email settings and employee workflows

Super Admins configure outgoing SMTP email under **Settings → Email settings**.
Use the mailbox provider’s SMTP hostname, encryption/port, full username and password, and a permitted sender address. Save, verify the connection, then optionally send a test message to an address you control. No patient details are included in test messages. Automatic patient email notifications are not enabled by this change.

Only active Super Admin accounts may read or write these settings. Passwords are encrypted with AES-256-GCM and never returned by the API. Leave the password blank to retain the saved secret; changing the host or username requires re-entering it.

## Deployment and backup

The existing Prisma Settings table stores configuration; this feature adds no database migration. Back up the database and the server’s `.private/email-settings.key` separately from Git. Restore both together to preserve the ability to decrypt the saved SMTP password. Alternatively configure `EMAIL_SETTINGS_ENCRYPTION_KEY` as 64 hexadecimal characters through the hosting environment. Changing or losing the key requires re-entering the mailbox password.

The SMTP transport pins emailjs 4.0.3 for the hosting server’s Node.js 17 compatibility. Its adapter repeats EHLO to complete authentication on an already established TLS connection. Certificates are verified, plaintext authentication is blocked, and resolved SMTP addresses must be public. Do not replace the pinned package without verifying runtime compatibility.

## Employee workflows

Page help explains each main task in English and Arabic. Patient search supports status filtering, pagination and clear error recovery. New registration saves the patient, generated card, initial package and purchase transaction together. Card scanning asks for confirmation before recording a session. Session date filters include the whole final day in Oman time. Membership card print dimensions remain 85.6 × 54 mm.

## Validation

Run `npm run typecheck` and `node --test tests/languages.cjs tests/super-admin.cjs tests/card-pdf.cjs tests/email-settings.cjs tests/workflows.cjs`. The SMTP integration fixture runs entirely on localhost with a temporary test certificate and dummy credentials; it sends no external email.
