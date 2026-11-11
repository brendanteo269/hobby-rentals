import type { HelpBlock as HelpBlockData } from "@/lib/help";

/** One paragraph or bullet list of help copy, styled the same wherever lib/help content is shown. */
export function HelpBlock({ block }: { block: HelpBlockData }) {
  if (typeof block === "string") return <p className="body-copy">{block}</p>;
  return (
    <ul className="body-copy list-disc space-y-1.5 pl-5">
      {block.list.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
