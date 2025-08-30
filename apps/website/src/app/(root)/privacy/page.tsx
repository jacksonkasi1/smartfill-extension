// ** import lib
import React from 'react'
import FooterSection from '@/components/footer'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* Header Section */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            Privacy Policy
          </h1>
          <div className="mx-auto h-1 w-24 bg-primary rounded-full mb-6"></div>
          <p className="text-muted-foreground text-lg">
            Last updated: January 2025
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {/* Information We Collect */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold">
              Information We Collect
            </h2>
            <div className="mb-4">
              <p className="mb-4 text-muted-foreground leading-relaxed">
                SmartFill is designed with privacy in mind. We collect minimal information necessary for the extension to function:
              </p>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                Form field data temporarily processed for auto-filling (not stored)
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                Basic usage statistics to improve the extension
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                Error logs for debugging purposes
              </li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold">
              How We Use Your Information
            </h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              Your information is used solely to:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                Provide form auto-filling functionality
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                Improve the accuracy of field detection
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                Fix bugs and enhance user experience
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                Ensure the extension works properly across different websites
              </li>
            </ul>
          </section>

          {/* Data Storage and Security */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold">
              Data Storage and Security
            </h2>
            <div className="mb-6 rounded-lg border bg-muted/50 p-6">
              <h3 className="mb-3 text-lg font-medium">
                Local Processing:
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                All form data is processed locally on your device and is never transmitted to external servers.
              </p>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                No personal form data is stored permanently
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                All processing happens within your browser
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                No data is shared with third parties
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                Extension settings are stored locally in your browser
              </li>
            </ul>
          </section>

          {/* Permissions */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold">
              Permissions
            </h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              SmartFill requires the following browser permissions:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                <div>
                  <strong>Active Tab:</strong> To interact with forms on the current webpage
                </div>
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                <div>
                  <strong>Storage:</strong> To save your extension preferences and API keys locally
                </div>
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                <div>
                  <strong>Tabs:</strong> To communicate between extension components and inject content scripts
                </div>
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                <div>
                  <strong>Scripting:</strong> To inject form detection scripts into web pages
                </div>
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                <div>
                  <strong>Cookies:</strong> To access authentication cookies for user session management
                </div>
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                <div>
                  <strong>Host Permissions:</strong> Access to localhost for development and Clerk authentication service
                </div>
              </li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold">
              Third-Party Services
            </h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              SmartFill may use AI services for form field analysis. When using these services:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                Only field structure information is sent, not your personal data
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                Data is processed anonymously
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                No personally identifiable information is transmitted
              </li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold">
              Your Rights
            </h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              You have the right to:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                Disable the extension at any time
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                Clear all stored extension data from your browser
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                Contact us with privacy concerns
              </li>
              <li className="flex items-start">
                <span className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                Request information about data processing
              </li>
            </ul>
          </section>

          {/* Changes to This Policy */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold">
              Changes to This Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this privacy policy from time to time. Any changes will be posted on this page with an updated revision date.
            </p>
          </section>

          {/* Contact Us */}
          <section className="rounded-lg border bg-muted/30 p-8">
            <h2 className="mb-6 text-2xl font-semibold">
              Contact Us
            </h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              If you have any questions about this privacy policy or SmartFill's data practices, please contact us:
            </p>
            <div className="flex items-center space-x-2">
              <span className="font-medium">Email:</span>
              <a 
                href="mailto:jackosnkasipeacock@gmail.com" 
                className="text-primary hover:underline"
              >
                jackosnkasipeacock@gmail.com
              </a>
            </div>
          </section>
        </div>
      </div>
      <FooterSection />
    </div>
  )
}