import { parsePrivacyNotice } from "../privacy-render";

// Renders the stored privacy notice as text-only blocks (no HTML injection).
export function PrivacyNotice({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      {parsePrivacyNotice(text).map((block, index) => {
        if (block.type === "heading") {
          return (
            <h2 key={index} className="pt-2 text-base font-semibold">
              {block.text}
            </h2>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={index} className="list-disc pl-5">
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{block.text}</p>;
      })}
    </div>
  );
}
