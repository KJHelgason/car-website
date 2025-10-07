import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/" className="text-primary hover:underline mb-4 inline-block">
        ← Back to Home
      </Link>
      
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="space-y-6 text-muted-foreground">
        <p className="text-sm">Last updated: {new Date().toLocaleDateString()}</p>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">Introduction</h2>
          <p>
            Welcome to Car Price Analysis. We respect your privacy and are committed to protecting your personal data. 
            This privacy policy will inform you about how we look after your personal data when you visit our website 
            and tell you about your privacy rights.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">Information We Collect</h2>
          <p className="mb-2">We may collect, use, store and transfer different kinds of personal data about you:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Usage Data: Information about how you use our website</li>
            <li>Technical Data: IP address, browser type and version, time zone setting, browser plug-in types and versions, operating system and platform</li>
            <li>Search Data: Car makes, models, prices, and other search criteria you enter</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">How We Use Your Information</h2>
          <p className="mb-2">We use your information to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Provide and improve our car price analysis services</li>
            <li>Understand how users interact with our website</li>
            <li>Analyze trends and user behavior</li>
            <li>Serve relevant advertisements through Google AdSense</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">Cookies</h2>
          <p>
            Our website uses cookies to distinguish you from other users. This helps us provide you with a good 
            experience and allows us to improve our site. You can set your browser to refuse all or some browser 
            cookies, or to alert you when websites set or access cookies.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">Third-Party Services</h2>
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-foreground">Google Analytics</h3>
              <p>
                We use Google Analytics to understand how visitors use our site. Google Analytics uses cookies to 
                collect information about your use of our website anonymously.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Google AdSense</h3>
              <p>
                We use Google AdSense to display advertisements. Google may use cookies to serve ads based on your 
                prior visits to our website or other websites. You can opt out of personalized advertising by visiting 
                <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                  Google Ads Settings
                </a>.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">Your Rights</h2>
          <p className="mb-2">Under GDPR, you have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Request access to your personal data</li>
            <li>Request correction of your personal data</li>
            <li>Request erasure of your personal data</li>
            <li>Object to processing of your personal data</li>
            <li>Request restriction of processing your personal data</li>
            <li>Request transfer of your personal data</li>
            <li>Withdraw consent at any time</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">Data Security</h2>
          <p>
            We have implemented appropriate security measures to prevent your personal data from being accidentally 
            lost, used, or accessed in an unauthorized way. We limit access to your personal data to those who have 
            a genuine business need to access it.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">Children&apos;s Privacy</h2>
          <p>
            Our website is not intended for children under 16 years of age. We do not knowingly collect personal 
            information from children under 16.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the 
            new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us through our website contact form.
          </p>
        </section>
      </div>
    </div>
  );
}
