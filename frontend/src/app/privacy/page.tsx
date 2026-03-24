export const metadata = {
  title: 'Privacy Policy · My Finances',
  description: 'Privacy policy for My Finances — how your data is collected, stored, and used.',
};

export default function PrivacyPage() {
  const lastUpdated = 'March 24, 2026';
  const appName = 'My Finances';
  const appUrl = 'https://www.my-finances.site';
  const contactEmail = 'mharshvardhan1681@gmail.com';

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: {lastUpdated}</p>

      <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">1. Overview</h2>
          <p>
            {appName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is a personal
            finance tracking application available at{' '}
            <a href={appUrl} className="text-primary underline">
              {appUrl}
            </a>
            . This Privacy Policy explains what information we collect, how we use it, and your
            rights regarding your data.
          </p>
          <p className="mt-3">
            By using {appName}, you agree to the practices described in this policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">2. Information We Collect</h2>
          <h3 className="font-medium text-foreground mb-1">Account information</h3>
          <p>
            When you sign up, we collect your name and email address. These are used solely to
            identify your account.
          </p>

          <h3 className="font-medium text-foreground mt-4 mb-1">Financial data you enter</h3>
          <p>
            All investment transactions (stocks, mutual funds, gold, crypto, EPF, FD, RD), expense
            records, and goals are entered by you and stored in your account. This data is never
            shared with third parties.
          </p>

          <h3 className="font-medium text-foreground mt-4 mb-1">Profile information</h3>
          <p>
            You may optionally provide your phone number and PAN number to enable PDF password
            derivation for email imports. Your PAN number is encrypted using AES-256-GCM before
            being stored and is never logged or transmitted in plain text.
          </p>

          <h3 className="font-medium text-foreground mt-4 mb-1">Gmail access (optional)</h3>
          <p>
            If you choose to connect your Gmail account, we request read-only access (
            <code className="bg-muted px-1 rounded text-xs">gmail.readonly</code> scope) to search
            for specific financial statement emails from CDSL (
            <code className="bg-muted px-1 rounded text-xs">eCAS@cdslstatement.com</code>) and
            SafeGold (<code className="bg-muted px-1 rounded text-xs">estatements@safegold.in</code>
            ).
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>We only access emails matching those specific senders.</li>
            <li>We only download PDF attachments from those emails.</li>
            <li>We do not read, store, or process the body or subject of your emails.</li>
            <li>We do not access any other emails in your inbox.</li>
            <li>
              Your Gmail OAuth refresh token is encrypted with AES-256-GCM before being stored in
              our database.
            </li>
            <li>
              You can disconnect Gmail at any time from the Integrations page, which permanently
              deletes the stored token.
            </li>
          </ul>
          <p className="mt-3">
            Our use of data obtained via Google APIs complies with the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">3. How We Use Your Data</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              To display your financial portfolio, transactions, and analytics within the app.
            </li>
            <li>To parse financial statement PDFs and populate your transaction records.</li>
            <li>To authenticate your account securely.</li>
            <li>To calculate portfolio metrics (XIRR, P&amp;L, net worth, savings rate).</li>
          </ul>
          <p className="mt-3">
            We do <strong className="text-foreground">not</strong> use your data for advertising,
            profiling, or any purpose beyond operating the app for you.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">4. Data Storage & Security</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>All data is stored in a private MongoDB database.</li>
            <li>Sensitive fields (PAN number, Gmail refresh token) are AES-256-GCM encrypted.</li>
            <li>Authentication uses JWT tokens stored in httpOnly cookies.</li>
            <li>All communication between client and server uses HTTPS.</li>
            <li>
              The application backend is hosted on Render; the database is hosted on MongoDB Atlas.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">5. Data Sharing</h2>
          <p>
            We do <strong className="text-foreground">not</strong> sell, rent, or share your
            personal or financial data with any third party. The only external services we
            communicate with are:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>
              <strong className="text-foreground">Yahoo Finance</strong> — to fetch live stock
              prices (your data is not sent; only stock symbols are queried).
            </li>
            <li>
              <strong className="text-foreground">MFAPI</strong> — to fetch mutual fund NAV history
              (scheme numbers only).
            </li>
            <li>
              <strong className="text-foreground">CoinDCX</strong> — to fetch crypto prices (coin
              symbols only).
            </li>
            <li>
              <strong className="text-foreground">SafeGold API</strong> — to fetch gold rates (no
              user data sent).
            </li>
            <li>
              <strong className="text-foreground">Google (Gmail API)</strong> — only if you
              explicitly connect your Gmail account.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            6. Data Retention & Deletion
          </h2>
          <p>
            Your data is retained as long as your account exists. You can delete individual
            transaction types at any time from the Profile page (Data Management section). To
            permanently delete your account and all associated data, contact us at the email below.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">7. Your Rights</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>You can view and edit all your data within the app at any time.</li>
            <li>You can disconnect Gmail integration at any time from the Integrations page.</li>
            <li>You can delete all data for any asset type from the Profile page.</li>
            <li>You can request full account deletion by contacting us.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">8. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at the
            top of this page will reflect any changes. Continued use of the app after changes
            constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">9. Contact</h2>
          <p>
            If you have questions about this privacy policy or how your data is handled, contact us
            at:{' '}
            <a href={`mailto:${contactEmail}`} className="text-primary underline">
              {contactEmail}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
