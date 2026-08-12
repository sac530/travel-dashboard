"use client";

import { useRef, useState } from "react";
import type { ComponentType } from "react";
import { CheckCircle2, FileText, Image, Link2, Upload, X } from "lucide-react";
import { addUpload } from "@/lib/api";

type UploadType = "screenshot" | "url" | "note";
type UploadDraft = { type: UploadType; content: string; caption: string; id: number };

export default function UploadSection() {
  const [uploads, setUploads] = useState<UploadDraft[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);

  function addDraft(type: UploadType, content = "", caption = "") {
    setUploads((prev) => [...prev, { type, content, caption, id: nextId.current++ }]);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const dataUrl = loadEvent.target?.result;
        if (typeof dataUrl === "string") addDraft("screenshot", dataUrl, file.name);
      };
      reader.readAsDataURL(file);
    });

    event.target.value = "";
  }

  async function saveUploads() {
    const ready = uploads.filter((upload) => upload.content.trim() || upload.caption.trim());
    if (!ready.length) return;
    setStatus("saving");
    setError("");

    try {
      await Promise.all(
        ready.map((upload) =>
          addUpload({
            upload_type: upload.type,
            content: upload.content || upload.caption,
            caption: upload.caption || null,
            parsed: false,
            added_to_package: false,
          }),
        ),
      );
      setUploads([]);
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not save uploads.");
    }
  }

  return (
    <section>
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-sky-300">
          <Upload className="h-4 w-4" />
          Manual deal capture
        </div>
        <h2 className="text-3xl font-bold text-white">Upload Deals</h2>
        <p className="mt-3 max-w-xl text-slate-400">
          Add screenshots, URLs, or plain notes. They save to manual_uploads for the
          intake processor to parse and attach to a package.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickButton icon={Image} label="Screenshot" tone="text-sky-300" onClick={() => fileInputRef.current?.click()} />
        <QuickButton icon={Link2} label="URL" tone="text-orange-300" onClick={() => addDraft("url")} />
        <QuickButton icon={FileText} label="Notes" tone="text-violet-300" onClick={() => addDraft("note")} />
      </div>

      <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />

      {status === "saved" && (
        <div className="mb-6 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-200">
          Uploads saved for processing.
        </div>
      )}
      {status === "error" && (
        <div className="mb-6 rounded-lg border border-rose-400/20 bg-rose-400/10 p-4 text-rose-200">
          {error}
        </div>
      )}

      {uploads.length === 0 ? (
        <div className="glass-card p-8 text-center text-slate-400">
          <Upload className="mx-auto mb-3 h-8 w-8 text-slate-500" />
          Add a screenshot, URL, or note to start a manual upload batch.
        </div>
      ) : (
        <div className="space-y-4">
          {uploads.map((upload) => (
            <div key={upload.id} className="glass-card p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium capitalize text-slate-300">
                  {upload.type === "screenshot" && <Image className="h-4 w-4 text-sky-300" />}
                  {upload.type === "url" && <Link2 className="h-4 w-4 text-orange-300" />}
                  {upload.type === "note" && <FileText className="h-4 w-4 text-violet-300" />}
                  {upload.type}
                </div>
                <button
                  type="button"
                  onClick={() => setUploads((prev) => prev.filter((item) => item.id !== upload.id))}
                  className="rounded-md p-1 text-slate-500 transition hover:bg-white/7 hover:text-white"
                  title="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {upload.type === "screenshot" ? (
                <div className="mb-3 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                  <img src={upload.content} alt={upload.caption || "Uploaded deal screenshot"} className="max-h-64 w-full object-contain" />
                </div>
              ) : upload.type === "url" ? (
                <input
                  type="url"
                  placeholder="https://..."
                  value={upload.content}
                  onChange={(event) =>
                    setUploads((prev) =>
                      prev.map((item) => (item.id === upload.id ? { ...item, content: event.target.value } : item)),
                    )
                  }
                  className="field-input"
                />
              ) : (
                <textarea
                  rows={4}
                  placeholder="Example: Miami hotel showed $129/night on Expedia, Aug 22-24, free cancellation."
                  value={upload.content}
                  onChange={(event) =>
                    setUploads((prev) =>
                      prev.map((item) => (item.id === upload.id ? { ...item, content: event.target.value } : item)),
                    )
                  }
                  className="field-input resize-y"
                />
              )}

              <input
                type="text"
                placeholder="Caption or package hint"
                value={upload.caption}
                onChange={(event) =>
                  setUploads((prev) =>
                    prev.map((item) => (item.id === upload.id ? { ...item, caption: event.target.value } : item)),
                  )
                }
                className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300"
              />
            </div>
          ))}

          <button
            type="button"
            onClick={saveUploads}
            disabled={status === "saving"}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-70"
          >
            <CheckCircle2 className="h-5 w-5" />
            {status === "saving" ? "Saving..." : "Save Upload Batch"}
          </button>
        </div>
      )}
    </section>
  );
}

function QuickButton({
  icon: Icon,
  label,
  tone,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="glass-card p-6 text-center transition hover:-translate-y-1 hover:border-white/20">
      <Icon className={`mx-auto mb-3 h-8 w-8 ${tone}`} />
      <span className="font-semibold text-white">{label}</span>
    </button>
  );
}
