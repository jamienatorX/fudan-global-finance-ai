import Link from 'next/link';
import { Bot, Sparkles } from 'lucide-react';

export function CopilotLauncher() {
  return (
    <Link href="/copilot" aria-label="Ask AI banker" className="fixed bottom-5 right-4 z-30 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-elevated)] transition-transform hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:bottom-7 sm:right-7">
      <span className="relative"><Bot size={20} aria-hidden /><Sparkles size={10} className="absolute -right-1.5 -top-1.5 text-blue-100" aria-hidden /></span>
      <span className="hidden sm:inline">Ask AI banker</span>
    </Link>
  );
}
