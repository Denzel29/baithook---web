// Merge fields an email can contain. Learners see their own details; authors preview with a sample.
export const MERGE_FIELDS = [
  { token: "{{firstName}}", label: "First name" },
  { token: "{{lastName}}", label: "Last name" },
  { token: "{{fullName}}", label: "Full name" },
  { token: "{{email}}", label: "Email address" },
] as const;

// Shown in authoring previews so a greeting reads naturally
export const SAMPLE_RECIPIENT = { firstName: "Alex", lastName: "Morgan", fullName: "Alex Morgan", email: "alex.morgan@yourcompany.example" };

export function fillSample(text: string): string {
  if (!text.includes("{{")) return text;
  return text.replace(/\{\{\s*([A-Za-z]+)\s*\}\}/g, (_m, name: string) => (SAMPLE_RECIPIENT as Record<string, string>)[name] ?? "");
}
