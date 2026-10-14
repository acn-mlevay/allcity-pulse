"use client";
import { useState } from "react";
import type { ContentItem, Trend } from "@/lib/types";
import { OUTLET_CONTACTS } from "@/config/outlets";
import { embedCode, mailto, pitch } from "@/lib/share";

/** Share, download, embed, and email-pitch actions for one piece of content. */
export function ContentActions({ item, trend }: { item: ContentItem; trend?: Trend }) {
  const [panel, setPanel] = useState<null | "pitch">(null);
  const [flash, setFlash] = useState<string | null>(null);
  const embed = embedCode(item);

  const note = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1600);
  };
  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      note(msg);
    } catch {
      window.prompt("Copy", text);
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, text: `${item.title} (${item.show})`, url: item.link });
        return;
      } catch {
        return; // user cancelled
      }
    }
    copy(item.link, "Link copied");
  };

  return (
    <div className="actions">
      <div className="action-row">
        <button type="button" className="act" onClick={share}>Share</button>
        <button type="button" className="act" onClick={() => copy(item.link, "Link copied")}>Copy link</button>
        {item.audio && (
          <a className="act" href={item.audio} download target="_blank" rel="noreferrer">Download MP3</a>
        )}
        {embed && <button type="button" className="act" onClick={() => copy(embed, "Embed code copied")}>Embed</button>}
        <button
          type="button"
          className={`act act-primary ${panel === "pitch" ? "is-on" : ""}`}
          onClick={() => setPanel(panel === "pitch" ? null : "pitch")}
          aria-expanded={panel === "pitch"}
        >
          Email pitch
        </button>
        {flash && <span className="flash" role="status">{flash}</span>}
      </div>
      {panel === "pitch" && <PitchPanel item={item} trend={trend} />}
    </div>
  );
}

function PitchPanel({ item, trend }: { item: ContentItem; trend?: Trend }) {
  const draft = pitch(item, trend);
  const outlets = trend?.outlets || [];
  const [outlet, setOutlet] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);

  return (
    <div className="pitch">
      {outlets.length > 0 && (
        <label className="pitch-field">
          <span>Outlet covering this story</span>
          <select
            value={outlet}
            onChange={(e) => {
              setOutlet(e.target.value);
              setTo(OUTLET_CONTACTS[e.target.value] || "");
            }}
          >
            <option value="">Choose an outlet</option>
            {outlets.map((o) => (
              <option key={o.source} value={o.source}>
                {o.source} ({o.count} {o.count === 1 ? "story" : "stories"}){OUTLET_CONTACTS[o.source] ? "" : " - no contact saved"}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="pitch-field">
        <span>To</span>
        <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="editor@outlet.com" />
      </label>
      <label className="pitch-field">
        <span>Subject</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <label className="pitch-field">
        <span>Message</span>
        <textarea rows={7} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <div className="action-row">
        <a className="act act-primary" href={mailto(to, subject, body)}>Open in email</a>
        <button type="button" className="act" onClick={() => navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)}>
          Copy pitch
        </button>
      </div>
    </div>
  );
}
