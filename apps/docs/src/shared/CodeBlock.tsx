import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CodeBlock({ code }: Readonly<{ code: string }>) {
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("Copied");
    } catch {
      setMessage("Select the command and copy it manually.");
    }
  }
  return <div className="code-block">
    <div className="code-heading"><span>Terminal</span><button type="button" onClick={copy} aria-label="Copy commands">
      {message === "Copied" ? <Check size={14} /> : <Copy size={14} />}<span>Copy</span>
    </button></div>
    <pre><code>{code}</code></pre><span className="sr-only" role="status">{message}</span>
  </div>;
}
