import { useState } from "react";

export default function HelpSupport() {
  const [activeIndex, setActiveIndex] = useState(null);

  const faqs = [
    {
      question: "How do I create a new social media campaign and what information do I need to provide?",
      answer:
        "To create a new campaign, navigate to the 'Create Campaign' page from the sidebar menu. You'll need to provide essential details such as your product description, target audience, campaign objectives, and preferred social media platforms. Fill in all required fields including campaign name, product details, target demographics, and any specific messaging you want to include. Once you've completed all the necessary information, click the submit button to generate AI-powered content suggestions for your campaign. The system will then create personalized posts optimized for your selected platforms and audience.",
    },
    {
      question: "Where can I view, manage, and track the performance of my social media campaigns?",
      answer:
        "Navigate to the 'My Campaigns' page from the main sidebar to access a comprehensive dashboard of all your campaigns. Here you can view both active and completed campaigns, track their scheduling status (Draft, Scheduled, Posted, or Failed), monitor post performance metrics, and manage campaign batches. You can also reschedule posts, view detailed campaign analytics, delete campaigns, and access the calendar view to see your posting schedule. Each campaign card displays key information like creation date, number of posts, current status, and quick action buttons for easy management.",
    },
    {
      question: "How do I integrate my Google account and other social media platforms for seamless posting and calendar management?",
      answer:
        "To connect your external accounts, go to Settings > Integrations from the main navigation menu. Here you can connect your Google account to enable calendar synchronization and Google Drive features for storing campaign assets. You can also integrate your social media accounts including Twitter, Facebook, Instagram, LinkedIn, and Reddit for direct posting capabilities. Each integration provides specific benefits: Google Calendar helps you visualize your posting schedule, while social platform integrations allow you to publish posts directly from the campaign dashboard. Follow the authentication prompts for each service to complete the integration process.",
    },
    {
      question: "What should I do if I encounter issues, need technical support, or have questions about using the platform?",
      answer:
        "If you need assistance, you have several support options available. Use the contact form below to send us a detailed message about your issue or question - our support team typically responds within 24 hours during business days. For immediate help, check our comprehensive FAQ section which covers common topics like campaign creation, scheduling, platform integrations, and troubleshooting. You can also reach out through the in-app help system or email our support team directly. When contacting support, please include relevant details such as error messages, steps you've taken, and your account information to help us provide faster, more accurate assistance.",
    },
    {
      question: "How does the AI content generation work and how can I customize the generated posts for my brand?",
      answer:
        "Our AI-powered content generation uses advanced machine learning models to create personalized social media posts based on your product description, target audience, and campaign objectives. The system analyzes your input to generate platform-specific content that includes engaging captions, relevant hashtags, and optimal posting times. You can customize generated content by editing the text, adjusting hashtags, modifying images, and setting specific posting schedules. The AI learns from your preferences and feedback to improve future content suggestions, ensuring each campaign aligns with your brand voice and marketing goals.",
    },
    {
      question: "What are the different campaign statuses and how do I schedule or reschedule my social media posts?",
      answer:
        "Campaign statuses indicate the current state of your posts: 'Draft' means posts are created but not scheduled, 'Scheduled' indicates posts are queued for future publishing, 'Posted' shows successfully published content, and 'Failed' indicates posts that couldn't be published due to errors. To schedule posts, select a campaign with Draft status and click the 'Schedule' button, then choose your preferred posting times and platforms. You can reschedule existing campaigns by clicking the 'Reschedule' option and selecting new dates and times. The system also provides calendar integration to help you visualize and manage your posting schedule effectively.",
    },
  ];

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Your message has been sent!");
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Help & Support</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Welcome to the Help Center! Browse the FAQs below or contact support if you need further assistance.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FAQ Section - Takes 2/3 width on large screens */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold text-[var(--text)] mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-[var(--border)] rounded-lg shadow-sm bg-[var(--surface)] hover:shadow-md transition-shadow">
                <button
                  className="w-full flex justify-between items-center p-6 text-left hover:bg-gray-50 transition-colors rounded-lg"
                  onClick={() => toggleFAQ(index)}
                >
                  <span className="font-medium text-[var(--text)] text-lg leading-relaxed pr-4">{faq.question}</span>
                  <span className="text-[var(--text)] text-xl flex-shrink-0 ml-4">{activeIndex === index ? "−" : "+"}</span>
                </button>
                {activeIndex === index && (
                  <div className="px-6 pb-6 text-[var(--text-muted)] border-t border-[var(--border)] pt-4 leading-relaxed text-base">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form - Takes 1/3 width on large screens */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xl font-semibold text-[var(--text)]">Contact Support</h2>
          <div className="sticky top-6">
            <form
              onSubmit={handleSubmit}
              className="space-y-4 bg-[var(--surface)] p-6 rounded-lg shadow-sm border border-[var(--border)] hover:shadow-md transition-shadow"
            >
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2 text-[var(--text)]">
                  Your Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Enter your full name"
                  className="w-full border border-[var(--border)] rounded-lg px-4 py-3 bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-[var(--text)]">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  className="w-full border border-[var(--border)] rounded-lg px-4 py-3 bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-2 text-[var(--text)]">
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  required
                  placeholder="Brief description of your inquiry"
                  className="w-full border border-[var(--border)] rounded-lg px-4 py-3 bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2 text-[var(--text)]">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows="6"
                  required
                  placeholder="Please provide detailed information about your question or issue. Include any relevant error messages or steps you've already tried."
                  className="w-full border border-[var(--border)] rounded-lg px-4 py-3 bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all resize-none"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-[var(--primary)] text-white px-6 py-3 rounded-lg hover:bg-[var(--primary)]/90 transition-colors font-medium text-lg"
              >
                Send Message
              </button>
              <p className="text-xs text-[var(--text-muted)] text-center mt-3">
                We typically respond within 24 hours during business days
              </p>
            </form>
          </div>
          
          {/* Additional Support Options */}
          <div className="bg-[var(--surface)] p-6 rounded-lg shadow-sm border border-[var(--border)] space-y-4">
            <h3 className="font-semibold text-[var(--text)] mb-3">Other Ways to Get Help</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="text-blue-500 mt-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">Email Support</p>
                  <p className="text-xs text-[var(--text-muted)]">support@socialagent.com</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="text-green-500 mt-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">Live Chat</p>
                  <p className="text-xs text-[var(--text-muted)]">Available Mon-Fri 9AM-6PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}