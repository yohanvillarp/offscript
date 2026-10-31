import { useState } from "react";
import { Bot, HelpCircle, Terminal } from "lucide-react";

export function AiEngineGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2 border-t border-separator/60 pt-3">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Bot aria-hidden="true" className="size-3.5 text-accent" />
          AI Engine: Local Autonomous
        </span>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
        >
          <HelpCircle aria-hidden="true" className="size-3" />
          {open ? "Hide guide" : "Prerequisites & LLM"}
        </button>
      </div>

      {open && (
        <div className="space-y-2.5 rounded-md border border-separator bg-surface p-3 text-xs leading-relaxed text-muted">
          <div>
            <p className="font-semibold text-foreground">1. Required: Chromium browser</p>
            <p className="mt-0.5">Exploration uses local Chromium. If it does not start, run in your terminal:</p>
            <div className="mt-1 flex items-center gap-2 rounded bg-surface-subtle px-2 py-1 font-mono text-[11px] text-foreground">
              <Terminal aria-hidden="true" className="size-3 text-muted shrink-0" />
              <span>npx playwright install chromium</span>
            </div>
          </div>

          <div>
            <p className="font-semibold text-foreground">2. Recommended: Global CLI install</p>
            <p className="mt-0.5">For seamless project usage without local dependency conflicts:</p>
            <div className="mt-1 flex items-center gap-2 rounded bg-surface-subtle px-2 py-1 font-mono text-[11px] text-foreground">
              <Terminal aria-hidden="true" className="size-3 text-muted shrink-0" />
              <span>npm install -g @nikelyh/offscript</span>
            </div>
          </div>

          <div>
            <p className="font-semibold text-foreground">3. Optional: Live LLM (Gemini, Claude, GPT)</p>
            <p className="mt-0.5">By default, OFFSCRIPT explores autonomously without API keys. To connect a cloud LLM, add to your project's <code className="font-mono text-[11px]">.env</code>:</p>
            <div className="mt-1 space-y-0.5 rounded bg-surface-subtle px-2 py-1 font-mono text-[11px] text-foreground">
              <div>GEMINI_API_KEY=...</div>
              <div>OPENAI_API_KEY=...</div>
              <div>ANTHROPIC_API_KEY=...</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
