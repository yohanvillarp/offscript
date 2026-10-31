import type { Page } from "playwright";
import type { PageSnapshot } from "./types.ts";

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "details summary",
  "[role='button']",
  "[role='link']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='textbox']",
  "[role='combobox']",
  "[role='tab']",
  "[role='menuitem']",
].join(", ");

type EvaluatedElement = {
  ref: string;
  role: string;
  name: string;
  tagName: string;
  text: string;
  disabled: boolean;
  type?: string | undefined;
  checked?: boolean | undefined;
  expanded?: boolean | undefined;
  placeholder?: string | undefined;
};

export async function capturePageSnapshot(page: Page, epoch: number): Promise<PageSnapshot> {
  const url = page.url();
  const title = await page.title().catch(() => "");

  // Temporarily mask password values so they never appear in the accessibility tree
  const originalPasswords = await page
    .evaluate(() => {
      const saved: string[] = [];
      const pwElements = document.querySelectorAll<HTMLInputElement>("input[type='password']");
      for (const el of pwElements) {
        saved.push(el.value);
        el.value = "";
      }
      return saved;
    })
    .catch(() => []);

  let ariaSnapshot: string | undefined;
  try {
    ariaSnapshot = await page.locator(":root").ariaSnapshot();
  } catch {
    ariaSnapshot = undefined;
  }

  // Restore password values if necessary for form state
  if (originalPasswords.length > 0) {
    await page
      .evaluate((vals) => {
        const pwElements = document.querySelectorAll<HTMLInputElement>("input[type='password']");
        for (let i = 0; i < pwElements.length && i < vals.length; i++) {
          const val = vals[i];
          if (val !== undefined && pwElements[i]) pwElements[i]!.value = val;
        }
      }, originalPasswords)
      .catch(() => {});
  }

  const { elements, textSummary } = await page.evaluate(
    ({ selector, epochNumber }) => {
      // Clear any previous references
      for (const el of document.querySelectorAll("[data-offscript-ref]")) {
        el.removeAttribute("data-offscript-ref");
        el.removeAttribute("data-offscript-epoch");
      }

      function isVisible(el: Element): boolean {
        const htmlEl = el as HTMLElement;
        if (!htmlEl) return false;
        const rect = htmlEl.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        const style = window.getComputedStyle(htmlEl);
        if (style.visibility === "hidden" || style.display === "none") return false;
        return true;
      }

      function computeName(el: Element): string {
        const ariaLabel = el.getAttribute("aria-label");
        if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

        const labelledBy = el.getAttribute("aria-labelledby");
        if (labelledBy) {
          const labelEl = document.getElementById(labelledBy);
          if (labelEl?.textContent) return labelEl.textContent.trim();
        }

        const inputEl = el as HTMLInputElement;
        if (inputEl.labels && inputEl.labels.length > 0) {
          const label = inputEl.labels[0]?.textContent?.trim();
          if (label) return label;
        }

        if (inputEl.placeholder) return inputEl.placeholder.trim();

        const textContent = el.textContent?.trim() || "";
        return textContent.slice(0, 100);
      }

      function computeRole(el: Element): string {
        const explicitRole = el.getAttribute("role");
        if (explicitRole) return explicitRole.toLowerCase();

        const tag = el.tagName.toLowerCase();
        if (tag === "a") return "link";
        if (tag === "button") return "button";
        if (tag === "select") return "combobox";
        if (tag === "textarea") return "textbox";
        if (tag === "input") {
          const type = (el as HTMLInputElement).type.toLowerCase();
          if (type === "button" || type === "submit" || type === "reset") return "button";
          if (type === "checkbox") return "checkbox";
          if (type === "radio") return "radio";
          return "textbox";
        }
        return tag;
      }

      const found: EvaluatedElement[] = [];
      const candidates = document.querySelectorAll(selector);

      let counter = 1;
      for (const candidate of candidates) {
        if (!isVisible(candidate)) continue;

        const ref = `elem_${counter}`;
        candidate.setAttribute("data-offscript-ref", ref);
        candidate.setAttribute("data-offscript-epoch", String(epochNumber));

        const role = computeRole(candidate);
        const name = computeName(candidate);
        const inputEl = candidate as HTMLInputElement;
        const typeAttr = inputEl.type ? inputEl.type.toLowerCase() : undefined;
        const isPassword = typeAttr === "password";

        const text = isPassword ? "" : (candidate.textContent?.trim().slice(0, 80) || "");
        const disabled =
          (candidate as HTMLButtonElement).disabled === true ||
          candidate.getAttribute("aria-disabled") === "true";

        let checked: boolean | undefined;
        if (inputEl.checked !== undefined && (inputEl.type === "checkbox" || inputEl.type === "radio")) {
          checked = inputEl.checked;
        } else if (candidate.getAttribute("aria-checked") !== null) {
          checked = candidate.getAttribute("aria-checked") === "true";
        }

        let expanded: boolean | undefined;
        const ariaExpanded = candidate.getAttribute("aria-expanded");
        if (ariaExpanded === "true") expanded = true;
        else if (ariaExpanded === "false") expanded = false;

        const placeholder = !isPassword && inputEl.placeholder ? inputEl.placeholder : undefined;

        found.push({
          ref,
          role,
          name,
          tagName: candidate.tagName,
          text,
          disabled,
          ...(typeAttr ? { type: typeAttr } : {}),
          ...(checked !== undefined ? { checked } : {}),
          ...(expanded !== undefined ? { expanded } : {}),
          ...(placeholder ? { placeholder } : {}),
        });

        counter++;
      }

      // Collect bounded visible text summary
      const textNodes: string[] = [];
      const contentElements = document.querySelectorAll(
        "h1, h2, h3, h4, p, label, pre, [role='status'], [role='alert'], div[id], span[id], li",
      );
      let totalLength = 0;
      for (const h of contentElements) {
        if (!isVisible(h)) continue;
        const t = h.textContent?.trim();
        if (t && t.length > 0) {
          textNodes.push(`${h.tagName.toLowerCase()}: ${t}`);
          totalLength += t.length;
          if (totalLength > 3000) break;
        }
      }

      return { elements: found, textSummary: textNodes.join("\n") };
    },
    { selector: INTERACTIVE_SELECTOR, epochNumber: epoch },
  );

  return Object.freeze({
    url,
    title,
    textSummary,
    elements: Object.freeze(elements),
    snapshotEpoch: epoch,
    ...(ariaSnapshot ? { ariaSnapshot } : {}),
  });
}
