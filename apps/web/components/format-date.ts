// Post dates are shown in NYC time with a fixed locale, so every viewer sees the same label.
const formatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "America/New_York",
});

export function formatPostDate(iso: string): string {
  return formatter.format(new Date(iso));
}
