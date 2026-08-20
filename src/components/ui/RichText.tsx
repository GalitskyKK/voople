import { tokenizeRichText } from "@/lib/links/rich-text";
import { SafeExternalLink } from "./SafeExternalLink";

export function RichText({ text }: { text: string }) {
  return <>{tokenizeRichText(text).map((token, index) => token.type === "text" ? (
    <span key={`text-${index}`}>{token.value}</span>
  ) : (
    <SafeExternalLink key={`${token.url}-${index}`} url={token.url}>{token.value}</SafeExternalLink>
  ))}</>;
}
