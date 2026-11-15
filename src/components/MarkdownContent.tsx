import { Fragment } from 'react';

interface MarkdownContentProps {
  content: string;
}

function renderInlineFormatting(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let listItems: { ordered: boolean; text: string }[] = [];

  const flushList = (keyPrefix: string) => {
    if (listItems.length === 0) return;
    const isOrdered = listItems[0].ordered;
    if (isOrdered) {
      elements.push(
        <ol key={`${keyPrefix}-ol`} className="list-decimal space-y-1.5 pl-5 text-[15px] leading-[1.7] text-slate-700">
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInlineFormatting(item.text)}</li>
          ))}
        </ol>
      );
    } else {
      elements.push(
        <ul key={`${keyPrefix}-ul`} className="list-disc space-y-1.5 pl-5 text-[15px] leading-[1.7] text-slate-700">
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInlineFormatting(item.text)}</li>
          ))}
        </ul>
      );
    }
    listItems = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line) {
      flushList(`line-${index}`);
      return;
    }

    if (line.startsWith('### ')) {
      flushList(`line-${index}`);
      elements.push(
        <h4
          key={`h4-${index}`}
          className="pt-2 font-display text-base font-semibold text-slate-900"
        >
          {renderInlineFormatting(line.slice(4))}
        </h4>
      );
      return;
    }

    if (line.startsWith('## ')) {
      flushList(`line-${index}`);
      elements.push(
        <h3
          key={`h3-${index}`}
          className="pt-3 font-display text-lg font-semibold text-slate-900"
        >
          {renderInlineFormatting(line.slice(3))}
        </h3>
      );
      return;
    }

    if (line.startsWith('# ')) {
      flushList(`line-${index}`);
      elements.push(
        <h2
          key={`h2-${index}`}
          className="pt-1 font-display text-xl font-bold text-slate-900"
        >
          {renderInlineFormatting(line.slice(2))}
        </h2>
      );
      return;
    }

    if (line.startsWith('> ')) {
      flushList(`line-${index}`);
      elements.push(
        <blockquote
          key={`quote-${index}`}
          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] leading-relaxed text-slate-700"
        >
          {renderInlineFormatting(line.slice(2))}
        </blockquote>
      );
      return;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
    if (unorderedMatch) {
      if (listItems.length > 0 && listItems[0].ordered) {
        flushList(`line-${index}`);
      }
      listItems.push({ ordered: false, text: unorderedMatch[1] });
      return;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (listItems.length > 0 && !listItems[0].ordered) {
        flushList(`line-${index}`);
      }
      listItems.push({ ordered: true, text: orderedMatch[1] });
      return;
    }

    flushList(`line-${index}`);
    elements.push(
      <p key={`p-${index}`} className="text-[15px] leading-[1.7] text-slate-700">
        {renderInlineFormatting(line)}
      </p>
    );
  });

  flushList('end');

  return <div className="max-w-[68ch] space-y-3">{elements}</div>;
}
