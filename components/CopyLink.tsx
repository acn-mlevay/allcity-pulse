"use client";
import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  if (!url) return null;
  return (
    <button
      type="button"
      className="copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          window.prompt("Copy link", url);
        }
      }}
    >
      {done ? "Copied" : "Copy link"}
    </button>
  );
}
