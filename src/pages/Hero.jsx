import Button from "../components/ui/Button.jsx";
import { Link } from "react-router-dom";

function Hero() {
  function generateHelpDoc() {
    const content = `AgentAnywhere Help Guide\n\nGetting started:\n1. Create a campaign -> Click Get Started.\n2. Use Quick Actions to create posts, manage campaigns, and view analytics.\n\nScheduling:\n- Use Schedule & Automate to add slots.\n- Connect integrations to post automatically.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'agentanywhere-help.txt';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  return (
    <section className="glass p-12 rounded-3xl flex items-center justify-between">
      <div className="max-w-2xl">
        <h2 className="text-5xl font-extrabold gradient-primary-text mb-4">Your manager that never sleeps</h2>
        <p className="text-[var(--text-muted)] mb-6">Build, grow, and scale your business with a team of AI helpers — schedule posts, reply to comments, and automate work while you sleep.</p>
        <div className="flex items-center gap-4">
          <Link to="/create"><Button variant="primary" size="lg">Get Started</Button></Link>
          <Button variant="ghost" size="md" onClick={generateHelpDoc}>Learn more</Button>
        </div>
      </div>
      <div className="w-1/3 flex justify-end">
        <div className="rounded-2xl shadow-xl p-6" style={{ background: '#dff6e9', minWidth: 220, minHeight: 140 }}>
          <svg viewBox="0 0 300 180" className="w-full h-full" aria-hidden>
            <defs>
              <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="b" />
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <g stroke="#0b1724" strokeWidth="2" fill="none" opacity="0.9">
              <line x1="40" y1="90" x2="120" y2="40" stroke="#7f9cf5" strokeWidth="2" />
              <line x1="40" y1="90" x2="120" y2="140" stroke="#7ee7c6" strokeWidth="2" />
              <line x1="120" y1="40" x2="220" y2="60" stroke="#fca5a5" strokeWidth="2" />
              <line x1="120" y1="140" x2="220" y2="120" stroke="#fbbf24" strokeWidth="2" />
            </g>
            <g filter="url(#soft)">
              <circle cx="40" cy="90" r="18" fill="#3b82f6" />
              <text x="40" y="95" fill="#fff" fontSize="12" fontWeight="700" textAnchor="middle">F</text>
              <circle cx="120" cy="40" r="18" fill="#06b6d4" />
              <text x="120" y="45" fill="#fff" fontSize="12" fontWeight="700" textAnchor="middle">I</text>
              <circle cx="120" cy="140" r="18" fill="#34d399" />
              <text x="120" y="145" fill="#fff" fontSize="12" fontWeight="700" textAnchor="middle">Y</text>
              <circle cx="220" cy="60" r="18" fill="#f97316" />
              <text x="220" y="65" fill="#fff" fontSize="12" fontWeight="700" textAnchor="middle">T</text>
              <circle cx="220" cy="120" r="18" fill="#a78bfa" />
              <text x="220" y="125" fill="#fff" fontSize="12" fontWeight="700" textAnchor="middle">U</text>
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}

export default Hero;


