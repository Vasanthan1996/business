# Setup and deployment, step by step

Time needed: about 30 minutes. Cost: ₹0 (Google Cloud free tier + Vercel Hobby).

## 1. Run it locally first (no Google account needed)

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```
DB_DRIVER=local
AUTH_SECRET=<paste output of: openssl rand -base64 48>
ADMIN_NAME=V. Vasanthan
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=<8+ characters>
```

```bash
npm run setup   # creates .data/db.json with businesses, rooms and October bookings
npm run dev     # open http://localhost:3000 and sign in
```

Check the Aura report for October 2026 shows ₹99,937 revenue.

## 2. Create the Google Sheet

1. Go to sheets.google.com → Blank spreadsheet. Name it `Partner Ledger DB`.
2. Copy the ID from its URL: `docs.google.com/spreadsheets/d/`**`<THIS PART>`**`/edit`.
3. Leave it empty — the setup script creates all 10 tabs and header rows.

## 3. Create a Google Cloud service account

1. Open console.cloud.google.com → create a project (e.g. `partner-ledger`).
2. **APIs & Services → Library** → search "Google Sheets API" → **Enable**.
3. **APIs & Services → Credentials → Create credentials → Service account**.
   Name it `ledger-app`. Skip the optional role steps.
4. Open the new service account → **Keys → Add key → Create new key → JSON**.
   A file downloads. Keep it private; never commit it.
5. Back in your Google Sheet → **Share** → paste the service account's email
   (`ledger-app@partner-ledger.iam.gserviceaccount.com`, from the JSON
   `client_email`) → role **Editor** → untick "Notify" → Share.

## 4. Point the app at the sheet and run setup

In `.env.local`:

```
DB_DRIVER=sheets
GOOGLE_SHEET_ID=<sheet ID from step 2>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<client_email from the JSON>
GOOGLE_PRIVATE_KEY="<private_key from the JSON, exactly as it appears, with \n sequences>"
```

The private key must stay on one line inside double quotes, keeping the
literal `\n` characters from the JSON file. The app converts them back.

```bash
npm run setup
```

You should see: tabs created, admin created, 3 businesses, 3 rooms, 16 October
bookings totalling ₹99,937. Open the sheet to confirm the tabs. Then
`npm run dev` and sign in — you're now reading and writing the Google Sheet.

## 5. Push to GitHub

```bash
git add .
git commit -m "Partner Ledger: initial version"
```

Create an empty **private** repository on github.com (no README), then:

```bash
git remote add origin https://github.com/<you>/partner-ledger.git
git branch -M main
git push -u origin main
```

`.env.local` and `.data/` are git-ignored, so no secrets or local data are pushed.

## 6. Deploy on Vercel

1. vercel.com → **Add New → Project** → import the GitHub repo. Framework is
   detected as Next.js; leave build settings as they are.
2. Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DB_DRIVER` | `sheets` |
   | `GOOGLE_SHEET_ID` | sheet ID |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | client_email |
   | `GOOGLE_PRIVATE_KEY` | the private key (see note) |
   | `AUTH_SECRET` | a **new** random 48-character string, not your local one |
   | `NEXT_PUBLIC_APP_NAME` | optional, e.g. `Partner Ledger` |

   For `GOOGLE_PRIVATE_KEY` on Vercel, paste the key with the `\n` sequences
   exactly as in the JSON, **without** surrounding quotes.
3. **Deploy.** You don't run setup again — the sheet is already set up.
4. Open the Vercel URL and sign in with your admin email and password.

Every `git push` to `main` redeploys automatically. Pull requests get preview
URLs; they use the same sheet, so test carefully or point previews at a copy
of the sheet via a Preview-only `GOOGLE_SHEET_ID`.

## 7. First things to do in the app

1. **Accounts → New account**: create the Aura property manager (type
   *Property manager*, tick THE AURA COMFORT STAY). Share their password
   privately.
2. **Businesses & shares**: confirm the manager % for Generic Adhaar and
   ARIVU (seeded at 30% as placeholders) and add their investors so the
   percentages total 100%. Add the Aura location.
3. Create pharmacy and institute managers and shareholder accounts the same way.
4. When a month's payout is agreed, open its report and **Lock month** so its
   numbers can't change afterwards.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `The caller does not have permission` | Share the sheet with the service-account email as Editor. |
| `error:1E08010C:DECODER routines::unsupported` | The private key lost its line breaks. Re-paste it with `\n` kept. |
| `Google Sheets API has not been used in project…` | Enable the Sheets API in that Cloud project (step 3.2). |
| `AUTH_SECRET must be set…` | Add `AUTH_SECRET` (32+ characters) and redeploy. |
| Signed out right after signing in on `http://` | Session cookies are Secure in production; use the https Vercel URL. |
| Edits made directly in the sheet don't appear | They will within ~5 seconds (cache). Direct sheet edits skip the change log — prefer the app. |
