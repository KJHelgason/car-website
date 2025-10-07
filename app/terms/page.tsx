import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/" className="text-primary hover:underline mb-4 inline-block">
        ← Back to Home
      </Link>
      
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
      
      <div className="space-y-6 text-muted-foreground">
        <p className="text-sm">Last updated: {new Date().toLocaleDateString()}</p>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing and using Car Price Analysis, you accept and agree to be bound by the terms and 
            provision of this agreement. If you do not agree to these terms, please do not use our service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">2. Description of Service</h2>
          <p>
            Car Price Analysis provides users with car price estimates, market analysis, and listings information. 
            Our service aggregates publicly available data to help users make informed decisions about car purchases.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">3. Use of Service</h2>
          <p className="mb-2">You agree to use our service only for lawful purposes. You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use the service in any way that violates any applicable law or regulation</li>
            <li>Attempt to interfere with the proper working of the service</li>
            <li>Use any automated system to access the service in a manner that sends more requests than a human can reasonably produce</li>
            <li>Collect or harvest any personally identifiable information from the service</li>
            <li>Use the service for any commercial purpose without our express written consent</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">4. Price Estimates and Data Accuracy</h2>
          <p>
            The price estimates and market data provided by our service are for informational purposes only. 
            We strive to provide accurate information, but we do not guarantee the accuracy, completeness, or 
            timeliness of any information on the service. Actual car prices may vary based on condition, location, 
            seller, and other factors.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">5. No Professional Advice</h2>
          <p>
            The information provided on this website is not professional financial or purchasing advice. 
            You should conduct your own research and consult with qualified professionals before making any 
            purchasing decisions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">6. Third-Party Links</h2>
          <p>
            Our service may contain links to third-party websites or services that are not owned or controlled 
            by Car Price Analysis. We have no control over, and assume no responsibility for, the content, 
            privacy policies, or practices of any third-party websites or services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">7. Intellectual Property</h2>
          <p>
            The service and its original content, features, and functionality are owned by Car Price Analysis 
            and are protected by international copyright, trademark, patent, trade secret, and other intellectual 
            property or proprietary rights laws.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">8. Disclaimer of Warranties</h2>
          <p>
            The service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. We make no warranties, 
            expressed or implied, and hereby disclaim all warranties including, without limitation, implied warranties 
            of merchantability, fitness for a particular purpose, or non-infringement.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">9. Limitation of Liability</h2>
          <p>
            In no event shall Car Price Analysis, nor its directors, employees, partners, agents, suppliers, or 
            affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including 
            without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from 
            your access to or use of or inability to access or use the service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">10. Advertising</h2>
          <p>
            We may display advertisements and promotions on the service. Your interactions with advertisers and 
            any terms, conditions, warranties or representations associated with such dealings are solely between 
            you and the advertiser.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">11. Changes to Terms</h2>
          <p>
            We reserve the right to modify or replace these terms at any time. If a revision is material, we will 
            provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change 
            will be determined at our sole discretion.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">12. Governing Law</h2>
          <p>
            These terms shall be governed and construed in accordance with the laws of your jurisdiction, without 
            regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">13. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please{' '}
            <Link href="/contact" className="text-primary hover:underline">
              contact us
            </Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
