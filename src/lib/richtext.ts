/**
 * Slide text supports a tiny markup: **highlight** and line breaks.
 */
export interface RichSegment {
  text: string;
  hl: boolean;
}

export function parseRich(input: string): RichSegment[] {
  const parts = (input ?? "").split("**");
  const out: RichSegment[] = [];
  parts.forEach((text, i) => {
    if (!text) return;
    // An unmatched trailing ** (e.g. while streaming) leaves the tail un-highlighted
    const hl = i % 2 === 1 && i < parts.length - 1;
    out.push({ text, hl });
  });
  return out;
}

export function stripRich(input: string) {
  return (input ?? "").replace(/\*\*/g, "");
}

/** Convert a contentEditable element back to markup. Bold/strong/mark become highlights. */
export function serializeRich(root: HTMLElement): string {
  let out = "";
  const walk = (node: Node, inHl: boolean) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += (child.textContent ?? "").replace(/\*\*/g, "");
        return;
      }
      if (!(child instanceof HTMLElement)) return;
      const tag = child.tagName;
      if (tag === "BR") {
        out += "\n";
        return;
      }
      const isHl =
        !inHl &&
        (tag === "B" ||
          tag === "STRONG" ||
          tag === "MARK" ||
          child.dataset.hl === "1" ||
          Number(child.style.fontWeight) >= 700);
      const isBlock = tag === "DIV" || tag === "P";
      if (isBlock && out && !out.endsWith("\n")) out += "\n";
      if (isHl) out += "**";
      walk(child, inHl || isHl);
      if (isHl) out += "**";
    });
  };
  walk(root, false);
  return out
    .replace(/\*\*\*\*/g, "")
    .replace(/\*\*(\s*)\*\*/g, "$1")
    .replace(/ /g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
