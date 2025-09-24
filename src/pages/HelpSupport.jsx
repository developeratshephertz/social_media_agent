import { useState } from "react";

export default function HelpSupport() {
  const [activeIndex, setActiveIndex] = useState(null);

  const faqs = [
    {
      question: "How do I create a new campaign?",
      answer:
        "Go to the 'Create Campaign' page from the sidebar, fill in the required details, and click submit.",
    },
    {
      question: "Where can I see my campaigns?",
      answer:
        "Navigate to the 'My Campaigns' page to see all your active and past campaigns.",
    },
    {
      question: "How do I integrate my Google account?",
      answer:
        "Go to Settings > Integrations, and connect your Google account for calendar and drive features.",
    },
    {
      question: "How can I contact support?",
      answer:
        "Use the contact form below to reach out to us. We'll respond within 24 hours.",
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
      
      <div className="max-w-3xl mx-auto space-y-8">

        {/* FAQ Section */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-[var(--border)] rounded-lg shadow-sm bg-[var(--surface)]">
              <button
                className="w-full flex justify-between items-center p-4 text-left"
                onClick={() => toggleFAQ(index)}
              >
                <span className="font-medium text-[var(--text)]">{faq.question}</span>
                <span className="text-[var(--text)]">{activeIndex === index ? "−" : "+"}</span>
              </button>
              {activeIndex === index && (
                <div className="p-4 text-[var(--text-muted)] border-t border-[var(--border)]">{faq.answer}</div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Form */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-[var(--text)]">Contact Support</h2>
          <form
            onSubmit={handleSubmit}
            className="space-y-4 bg-[var(--surface)] p-6 rounded-lg shadow border border-[var(--border)]"
          >
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1 text-[var(--text)]">
                Your Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1 text-[var(--text)]">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-1 text-[var(--text)]">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows="4"
                placeholder="How can we help you?"
                className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all resize-none"
              ></textarea>
            </div>
            <button
              type="submit"
              className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--primary)]/90 transition-colors font-medium"
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}