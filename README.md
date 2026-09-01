# Grand Medical Care Membership System

Membership card management system for **Grand Medical Care**, prepared for **Plesk shared hosting without SSH access**.

## Stack

- Next.js 13.5 with App Router
- React 18
- Prisma with PostgreSQL
- jsPDF + html2canvas for printable PVC membership card PDF export
- jsbarcode for barcode rendering

## Important Hosting Note

As of **October 29, 2025**, Plesk states that **Next.js is not officially supported**. This project includes a `server.js` compatibility wrapper so the app can still run as a generic Node.js application inside Plesk.

## Production Commands

Use these commands locally or in hosting panels that expose package scripts:

```bash
npm install
npm run build
npm start
```

`npm start` runs `node server.js`, which serves the compiled Next.js application on the port provided by Plesk.

## Environment Variables

Copy `.env.example` and set the real values in Plesk:

```env
DATABASE_URL="postgresql://idossani_membership_cards:YOUR_DATABASE_PASSWORD@localhost:5432/idossani_gmc?schema=public"
JWT_SECRET="your-jwt-secret-key-here-min-32-chars"
NODE_ENV="production"
NEXT_PUBLIC_APP_NAME="Grand Medical Care"
NEXT_PUBLIC_APP_URL="https://gmc.techittechnologies.com"
NEXT_PUBLIC_CLINIC_PHONE="+968 0000 0000"
NEXT_PUBLIC_CLINIC_EMAIL="info@gmc.techittechnologies.com"
NEXT_PUBLIC_CLINIC_ADDRESS="Grand Medical Center, Oman"
WHATSAPP_BASE_URL="https://wa.me"
WHATSAPP_DEFAULT_COUNTRY_CODE="968"
NEXT_PUBLIC_BARCODE_FORMAT="CODE128"
NEXT_PUBLIC_BARCODE_WIDTH="2"
NEXT_PUBLIC_BARCODE_HEIGHT="72"
```

Do not hardcode passwords or secrets inside source files.

## Database Files Included

- Prisma schema: `prisma/schema.prisma`
- Migration SQL: `prisma/migrations/20260507000000_init/migration.sql`
- Fallback SQL import: `prisma/sql/init.sql`

Because SSH is unavailable, the safest production path is to import `prisma/sql/init.sql` using your PostgreSQL admin tool in Plesk or phpPgAdmin.

## Plesk Deployment Guide

### 1. Upload the project

Recommended options:

1. Upload the `httpdocs` project folder through **Plesk File Manager**.
2. Or connect the folder through **Plesk Git deployment** if your hosting plan provides it.

Upload these folders and files at minimum:

- `app`
- `components`
- `lib`
- `prisma`
- `public`
- `package.json`
- `server.js`
- `next.config.js`
- `tailwind.config.js`
- `postcss.config.js`
- `tsconfig.json`

Do not upload:

- `node_modules`
- `.next`

### 2. Create or confirm the PostgreSQL database

Use the production database details:

- Host: `localhost`
- Port: `5432`
- Database: `idossani_gmc`
- Username: `idossani_membership_cards`
- Password: set inside Plesk, then place it inside `DATABASE_URL`

### 3. Import the schema without SSH

Since SSH is not available, use the manual SQL import route:

1. Open the PostgreSQL database admin tool from Plesk.
2. Open the SQL import area.
3. Import the file `prisma/sql/init.sql`.
4. Verify that the tables were created:
   `users`, `members`, `membership_cards`, `transactions`, `whatsapp_logs`, `treatments`, `treatment_packages`, `member_packages`, `sessions`, `audit_logs`, `settings`

If your hosting provider gives you a way to run Node package scripts but not shell commands, you may also keep the migration files in `prisma/migrations` for reference. The manual SQL import remains the safest shared-hosting workflow.

### 4. Configure the Node.js application in Plesk

In **Websites & Domains > Node.js** set:

1. **Node.js Version**: `17.0`
2. **Package Manager**: `npm`
3. **Application Mode**: `Production`
4. **Application Root**: the uploaded project directory
5. **Document Root**: `public`
6. **Application Startup File**: `server.js`

Why `server.js`:

- Plesk expects a startup file in the application root.
- This project wraps Next.js inside `server.js` so Plesk can launch it like a standard Node.js app.

### 5. Set environment variables in Plesk

In the **Custom Environment Variables** section, add:

- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`
- `NEXT_PUBLIC_APP_NAME=Grand Medical Care`
- `NEXT_PUBLIC_APP_URL=https://gmc.techittechnologies.com`
- `NEXT_PUBLIC_CLINIC_PHONE`
- `NEXT_PUBLIC_CLINIC_EMAIL`
- `NEXT_PUBLIC_CLINIC_ADDRESS`
- `WHATSAPP_BASE_URL=https://wa.me`
- `WHATSAPP_DEFAULT_COUNTRY_CODE=968`
- `NEXT_PUBLIC_BARCODE_FORMAT=CODE128`
- `NEXT_PUBLIC_BARCODE_WIDTH=2`
- `NEXT_PUBLIC_BARCODE_HEIGHT=72`

### 6. Install packages from the Plesk UI

Plesk’s Node.js documentation says to use the Node.js screen to run package installation and package scripts from the panel.

From the Node.js page:

1. Click **NPM Install**
2. Wait until installation completes
3. Use **Run script**
4. Enter `build`
5. Run the script

This will execute the production build without SSH.

### 7. Start or restart the application

After install and build:

1. Click **Enable Node.js** or **Restart App**
2. Open the production URL:
   `https://gmc.techittechnologies.com`

## First Admin Setup Without SSH

Because shared hosting often has no shell access, this project includes a one-time admin bootstrap page:

1. Deploy the app and database first.
2. Visit:
   `https://gmc.techittechnologies.com/setup`
3. Create the first admin user.
4. After one admin user exists, the setup API automatically locks itself.
5. Sign in at:
   `https://gmc.techittechnologies.com/auth/login`

## Membership Card Features

- Grand Medical Care branding on login, navigation, dashboard, reports, and card design
- A membership card is created automatically when a new member is created
- Front and back membership card layout
- Barcode on the card back encodes `/c/{barcode}`, which redirects staff to the member file after login
- Member ID on card
- Expiry date on card
- Clinic contact details on card back
- Footer on cards and pages:
  `Developed by Irfan & Hasnain`
- Client-side PDF export sized for PVC card printing using jsPDF + html2canvas

## Local Development

If you do have a local terminal available:

```bash
npm install
npm run build
npm start
```

For local database development you may also use Prisma commands such as:

```bash
npx prisma migrate dev
npx prisma generate
```

These are optional for local work only. Production deployment on the shared host should use the Plesk UI plus the included SQL import file.
