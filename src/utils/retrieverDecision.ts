export function parseRetrieverOutput(raw: string): {
    skipSearch: boolean;
    query: string;
  } {
    let text = raw.trim();
    const fence = text.match(/^```(?:\w+)?\s*([\s\S]*?)\s*```$/);
    if (fence) text = fence[1].trim();
  
    if (
      (text.startsWith("`") && text.endsWith("`") && text.length >= 2) ||
      (text.startsWith('"') && text.endsWith('"') && text.length >= 2) ||
      (text.startsWith("'") && text.endsWith("'") && text.length >= 2)
    ) {
      text = text.slice(1, -1).trim();
    }
  
    const decision = text
      .replace(/^(rephrased(?:\s+question)?|response)\s*:\s*/i, "")
      .trim();
    const token = decision
      .replace(/[.!]+$/g, "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  
    if (token === "not_needed" || token === "notneeded") {
      return { skipSearch: true, query: "" };
    }
  
    return { skipSearch: false, query: text };
  }