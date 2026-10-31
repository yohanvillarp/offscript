import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export function ShareBar() {
  const [copied, setCopied] = useState(false);
  const shareUrl = "https://offscript.nikelyh.tech";
  const shareTitle = "OFFSCRIPT — Multi-Agent Software Exploration";
  const shareText = "Your users don't follow a script. Neither do ours. Explore your application through artificial user perspectives.";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    }
  }

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${shareTitle}\n${shareText}`
  )}&url=${encodeURIComponent(shareUrl)}`;

  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    shareUrl
  )}`;

  const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(
    shareUrl
  )}&title=${encodeURIComponent(shareTitle)}`;

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="share-bar" role="region" aria-label="Share OFFSCRIPT">
      <div className="share-bar-inner">
        <div className="share-label">
          <Share2 size={16} className="text-accent" />
          <span>Share OFFSCRIPT:</span>
        </div>

        <div className="share-actions">
          {hasNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="share-btn share-btn-native sm:hidden"
              aria-label="Share via device"
            >
              Share…
            </button>
          )}

          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="share-btn"
            aria-label="Share on X (Twitter)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>X</span>
          </a>

          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="share-btn"
            aria-label="Share on LinkedIn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
            </svg>
            <span>LinkedIn</span>
          </a>

          <a
            href={redditUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="share-btn"
            aria-label="Share on Reddit"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 14c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.702zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-4.466 3.99a.327.327 0 0 0-.231.096.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
            </svg>
            <span>Reddit</span>
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className="share-btn share-btn-copy"
            aria-label="Copy website link to clipboard"
          >
            {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
            <span>{copied ? "Copied!" : "Copy Link"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
