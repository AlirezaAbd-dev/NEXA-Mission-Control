import { Fragment } from "react";
function safeLink(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    return ["https:", "http:", "mailto:"].includes(parsed.protocol)
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}
function inline(text: string, depth = 0): React.ReactNode[] {
  if (depth > 4) return [text];
  const pattern =
    /(`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*|\[[^\]]+\]\([^\s)]+\)|@[a-zA-Z0-9_.-]+)/g;
  const result: React.ReactNode[] = [];
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > offset) result.push(text.slice(offset, index));
    const token = match[0],
      key = `${depth}:${index}`;
    if (token.startsWith("`"))
      result.push(
        <code
          key={key}
          className="rounded bg-slate-200/60 dark:bg-[#132428] px-1 font-mono text-xs"
        >
          {token.slice(1, -1)}
        </code>,
      );
    else if (token.startsWith("**"))
      result.push(
        <strong key={key}>{inline(token.slice(2, -2), depth + 1)}</strong>,
      );
    else if (token.startsWith("~~"))
      result.push(<del key={key}>{inline(token.slice(2, -2), depth + 1)}</del>);
    else if (token.startsWith("*"))
      result.push(<em key={key}>{inline(token.slice(1, -1), depth + 1)}</em>);
    else if (token.startsWith("@"))
      result.push(
        <span
          key={key}
          className="rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 px-1"
        >
          {token}
        </span>,
      );
    else {
      const split = token.indexOf("]("),
        label = token.slice(1, split),
        url = safeLink(token.slice(split + 2, -1));
      result.push(
        url ? (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-teal-600 dark:text-teal-400 underline"
          >
            {inline(label, depth + 1)}
          </a>
        ) : (
          <Fragment key={key}>{label}</Fragment>
        ),
      );
    }
    offset = index + token.length;
  }
  if (offset < text.length) result.push(text.slice(offset));
  return result;
}
export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n"),
    blocks: React.ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```"))
        code.push(lines[i++]);
      blocks.push(
        <pre
          key={i}
          className="overflow-auto rounded-lg bg-slate-100 dark:bg-[#070e10] p-3 text-xs font-mono"
        >
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push(
        <p
          role="heading"
          aria-level={Math.min(6, heading[1].length)}
          key={i}
          className={`font-bold ${heading[1].length === 1 ? "text-xl" : heading[1].length === 2 ? "text-lg" : "text-base"}`}
        >
          {inline(heading[2])}
        </p>,
      );
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(
          <li key={i}>{inline(lines[i].replace(/^\s*[-*]\s+/, ""))}</li>,
        );
        i++;
      }
      i--;
      blocks.push(
        <ul key={`list-${i}`} className="list-disc ps-5 space-y-1">
          {items}
        </ul>,
      );
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(
          <li key={i}>{inline(lines[i].replace(/^\s*\d+\.\s+/, ""))}</li>,
        );
        i++;
      }
      i--;
      blocks.push(
        <ol key={`ordered-${i}`} className="list-decimal ps-5 space-y-1">
          {items}
        </ol>,
      );
      continue;
    }
    if (line.startsWith("> ")) {
      blocks.push(
        <blockquote
          key={i}
          className="border-s-2 border-teal-500/40 ps-3 text-slate-500"
        >
          {inline(line.slice(2))}
        </blockquote>,
      );
      continue;
    }
    if (/^\s*---+\s*$/.test(line)) {
      blocks.push(
        <hr key={i} className="border-slate-200 dark:border-[#183035]" />,
      );
      continue;
    }
    blocks.push(
      line ? (
        <p key={i} className="whitespace-pre-wrap">
          {inline(line)}
        </p>
      ) : (
        <div key={i} className="h-1" />
      ),
    );
  }
  return <div className="space-y-2 break-words">{blocks}</div>;
}
