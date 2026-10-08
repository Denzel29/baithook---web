import type { PageAction, PageBlock } from "@/types/campaigns";

// Where an interaction leads, given which form fields the person filled in.
// Only the *names* of filled fields are ever needed: typed values stay in the
// browser and are never sent anywhere.
export type Destination = { goto: string } | { end: "dead_end" | "return_to_inbox" };

export function resolveAction(action: PageAction, filled: ReadonlySet<string>): Destination {
  if ("goto" in action) return { goto: action.goto };
  if ("branches" in action) {
    const hit = action.branches.find((b) => filled.has(b.if.field) === b.if.filled);
    return { goto: hit ? hit.goto : action.default };
  }
  return { end: action.end };
}

export function describeAction(action: PageAction): string {
  if ("goto" in action) return `Opens "${action.goto}"`;
  if ("branches" in action) return `Branches (${action.branches.length}), otherwise "${action.default}"`;
  return action.end === "dead_end" ? "Ends here" : "Back to the inbox";
}

export function blockActions(block: PageBlock): PageAction[] {
  if (block.type === "form") return [block.submit.action];
  if (block.type === "button" || block.type === "link") return [block.action];
  return [];
}

export function actionTargets(action: PageAction): string[] {
  if ("goto" in action) return [action.goto];
  if ("branches" in action) return [...action.branches.map((b) => b.goto), action.default];
  return [];
}

export const newBlockId = () => `b${Math.random().toString(36).slice(2, 9)}`;
