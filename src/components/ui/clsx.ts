export default function clsx(...a: Array<string | false | null | undefined | 0>): string {
  return a.filter(Boolean).join(" ");
}
