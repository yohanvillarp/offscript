import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function TerminalInstall() {
  const [copied, setCopied] = useState(false);
  const command = "npm install -g @nikelyh/offscript";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Manual selection fallback if clipboard write fails
    }
  }

  return (
    <div className="terminal-install" role="region" aria-label="Quick installation command">
      <div className="terminal-install-inner">
        <span className="terminal-prompt" aria-hidden="true">$</span>
        <code className="terminal-command">{command}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="terminal-copy-button"
          aria-label={copied ? "Command copied to clipboard" : "Copy install command to clipboard"}
          title="Copy command"
        >
          {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
          <span className="terminal-copy-text">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}
