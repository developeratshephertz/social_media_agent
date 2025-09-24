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
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Help & Support</h1>
      <p className="text-gray-600 mb-8">
        Welcome to the Help Center! Browse the FAQs below or contact support if
        you need further assistance.
      </p>

      {/* FAQ Section */}
      <div className="space-y-4 mb-10">
        {faqs.map((faq, index) => (
          <div key={index} className="border rounded-lg shadow-sm bg-white">
            <button
              className="w-full flex justify-between items-center p-4 text-left"
              onClick={() => toggleFAQ(index)}
            >
              <span className="font-medium">{faq.question}</span>
              <span>{activeIndex === index ? "−" : "+"}</span>
            </button>
            {activeIndex === index && (
              <div className="p-4 text-gray-600 border-t">{faq.answer}</div>
            )}
          </div>
        ))}
      </div>

      {/* Contact Form */}
      <h2 className="text-2xl font-semibold mb-4">Contact Support</h2>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white p-6 rounded-lg shadow"
      >
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Your Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="John Doe"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
          />
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-1">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            rows="4"
            placeholder="How can we help you?"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
          ></textarea>
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Submit
        </button>
      </form>
    </div>
  );
}