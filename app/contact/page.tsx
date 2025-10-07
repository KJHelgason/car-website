'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For now, just show success message
    // In production, you'd send this to your backend/email service
    console.log('Form submitted:', formData);
    setStatus('success');
    
    // Reset form
    setTimeout(() => {
      setFormData({ name: '', email: '', subject: '', message: '' });
      setStatus('idle');
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/" className="text-primary hover:underline mb-4 inline-block">
        ← Back to Home
      </Link>
      
      <h1 className="text-4xl font-bold mb-8">Contact Us</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Send us a Message</CardTitle>
              <CardDescription>
                Have a question or feedback? We&apos;d love to hear from you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-1">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Send Message
                </Button>

                {status === 'success' && (
                  <p className="text-green-600 text-sm">
                    Message sent successfully! We&apos;ll get back to you soon.
                  </p>
                )}
                {status === 'error' && (
                  <p className="text-red-600 text-sm">
                    Something went wrong. Please try again.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1">How accurate are your price estimates?</h3>
                <p className="text-sm text-muted-foreground">
                  Our estimates are based on real market data and statistical analysis. However, actual 
                  prices may vary based on condition, location, and other factors.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-1">Is this service free?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, Car Price Analysis is completely free to use. We support our service through 
                  advertising.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-1">How often is your data updated?</h3>
                <p className="text-sm text-muted-foreground">
                  We continuously update our database with new listings and market information to 
                  ensure you have the most current data available.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-1">Can I suggest a feature?</h3>
                <p className="text-sm text-muted-foreground">
                  Absolutely! We welcome feedback and feature suggestions. Please use the contact 
                  form to share your ideas.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Inquiries</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                For business partnerships, advertising opportunities, or other business-related 
                inquiries, please use the contact form above with the subject &quot;Business Inquiry&quot;.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
