import Link from 'next/link';

export default function About() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/" className="text-primary hover:underline mb-4 inline-block">
        ← Back to Home
      </Link>
      
      <h1 className="text-4xl font-bold mb-8">About Allir Bilar</h1>
      
      <div className="space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">Our Mission</h2>
          <p>
            Allir Bilar was created to help car buyers and sellers make informed decisions by providing 
            transparent, data-driven insights into the automotive market. We believe that everyone should have 
            access to accurate pricing information when buying or selling a vehicle.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">What We Do</h2>
          <p className="mb-4">
            Our platform aggregates and analyzes car listings from various sources to provide you with:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-foreground">Price Analysis:</strong> Get estimated market values for specific 
              cars based on make, model, year, and mileage
            </li>
            <li>
              <strong className="text-foreground">Market Comparisons:</strong> See how a particular listing compares 
              to similar vehicles in the market
            </li>
            <li>
              <strong className="text-foreground">Range Search:</strong> Find cars within your budget and preferences
            </li>
            <li>
              <strong className="text-foreground">Deal Insights:</strong> Identify potential good deals based on 
              market data
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">How It Works</h2>
          <p>
            We collect publicly available car listing data and apply statistical analysis to identify pricing 
            trends and patterns. Our algorithms consider factors such as make, model, year, mileage, and current 
            market conditions to provide you with reliable price estimates.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">Our Commitment</h2>
          <p className="mb-2">We are committed to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Providing accurate and up-to-date information</li>
            <li>Maintaining user privacy and data security</li>
            <li>Offering a free, accessible tool for all users</li>
            <li>Continuously improving our algorithms and data sources</li>
            <li>Being transparent about our methods and limitations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">Important Disclaimer</h2>
          <p>
            While we strive for accuracy, our price estimates are based on available market data and should be 
            used as a reference point, not as definitive valuations. Actual car values can vary based on condition, 
            location, specific features, and negotiation. We recommend using our tool as one of several resources 
            when making purchasing decisions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-3">Get in Touch</h2>
          <p>
            We value your feedback and suggestions. If you have questions, comments, or ideas for improvement, 
            please don&apos;t hesitate to{' '}
            <Link href="/contact" className="text-primary hover:underline">
              contact us
            </Link>.
          </p>
        </section>

        <section className="border-t border-border pt-6 mt-8">
          <p className="text-sm">
            Allir Bilar is an independent service and is not affiliated with any car dealership, 
            manufacturer, or listing platform.
          </p>
        </section>
      </div>
    </div>
  );
}
