"use client";

import { useState, useRef } from "react";
import { Upload, Image, Link2, FileText, X, CheckCircle2 } from "lucide-react";

type UploadType = 'screenshot' | 'url' | 'note';

export default function UploadSection() {
  const [uploads, setUploads] = useState<Array<{ type: UploadType; content: string; caption: string; id: number }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      // In production, upload to Supabase Storage or image host
      // For now, simulate with a data URL (in real app, use Cloudinary/S3)
      const reader = new FileReader();
      reader.onload = (ev: ProgressEvent<FileReader>) => {
        const dataUrl = ev.target?.result as string;
        if (!dataUrl) return;
        setUploads(prev => [...prev, {
            type: 'screenshot',
            content: dataUrl,
            caption: file.name,
            id: nextId.current++,
          }]);
      };
      reader.readAsDataURL(file);
    });

    // Reset so same file can be re-uploaded
    e.target.value = '';
  };

  const addUrlEntry = () => {
    setUploads(prev => [...prev, { type: 'url', content: '', caption: '', id: nextId.current++ }]);
  };

  const addNoteEntry = () => {
    setUploads(prev => [...prev, { type: 'note', content: '', caption: '', id: nextId.current++ }]);
  };

  const removeUpload = (id: number) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  return (
    <section>
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">Upload Deals</h2>
        <p className="text-gray-400 max-w-xl">
          Found a deal I can't scrape? Upload a screenshot, paste a URL, or just write notes. 
          I'll read everything and add it to the right package.
        </p>
      </div>

      {/* Quick-add buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="glass-card p-6 text-center hover-lift cursor-pointer"
        >
          <Image className="w-8 h-8 mx-auto mb-3 text-ocean-400" />
          <h3 className="font-semibold text-white">Screenshot</h3>
          <p className="text-sm text-gray-500 mt-1">Drop a deal screenshot here</p>
        </button>

        <button
          onClick={addUrlEntry}
          className="glass-card p-6 text-center hover-lift"
        >
          <Link2 className="w-8 h-8 mx-auto mb-3 text-sunset-400" />
          <h3 className="font-semibold text-white">URL</h3>
          <p className="text-sm text-gray-500 mt-1">Paste a deal link</p>
        </button>

        <button
          onClick={addNoteEntry}
          className="glass-card p-6 text-center hover-lift"
        >
          <FileText className="w-8 h-8 mx-auto mb-3 text-purple-400" />
          <h3 className="font-semibold text-white">Notes</h3>
          <p className="text-sm text-gray-500 mt-1">Write what you found</p>
        </button>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Upload entries */}
      {uploads.length > 0 && (
        <div className="space-y-4">
          {uploads.map((upload) => (
            <div key={upload.id} className={`glass-card p-5 ${upload.type === 'screenshot' ? '' : upload.type === 'url' ? 'border-l-4 border-l-sunset-500' : 'border-l-4 border-l-purple-500'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {upload.type === 'screenshot' && <Image className="w-4 h-4 text-ocean-400" />}
                  {upload.type === 'url' && <Link2 className="w-4 h-4 text-sunset-400" />}
                  {upload.type === 'note' && <FileText className="w-4 h-4 text-purple-400" />}
                  <span className="text-sm font-medium text-gray-400 capitalize">{upload.type}</span>
                </div>
                <button onClick={() => removeUpload(upload.id)} className="p-1 rounded hover:bg-white/5">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {upload.type === 'screenshot' ? (
                <div className="flex flex-wrap gap-3">
                  {/* In production, show actual image thumbnails */}
                  <div className="w-32 h-24 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-600">
                    📷 Image
                  </div>
                </div>
              ) : (
                <>
                  {upload.type === 'url' && (
                    <input
                      type="url"
                      placeholder="https://..."
                      value={upload.content}
                      onChange={(e) => {
                        setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, content: e.target.value } : u));
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-ocean-500 focus:outline-none transition-all"
                    />
                  )}
                  {upload.type === 'note' && (
                    <textarea
                      rows={3}
                      placeholder="What did you find? I'll read it and add to the right package."
                      value={upload.content}
                      onChange={(e) => {
                        setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, content: e.target.value } : u));
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-ocean-500 focus:outline-none transition-all resize-vertical"
                    />
                  )}
                </>
              )}

              <input
                type="text"
                placeholder="Caption (optional) — e.g., 'Found this hotel deal for Cancun'"
                value={upload.caption}
                onChange={(e) => {
                  setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, caption: e.target.value } : u));
                }}
                className="mt-2 w-full px-4 py-2 rounded-lg bg-transparent border-none text-sm text-gray-500 focus:outline-none"
              />
            </div>
          ))}

          {/* Submit all */}
          <button className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-ocean-500 to-sunset-500 hover:from-ocean-400 hover:to-sunset-400 text-white font-semibold transition-all shadow-lg shadow-ocean-500/20">
            <CheckCircle2 className="w-5 h-5" /> Process All Uploads
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-12 glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
        <ol className="space-y-3 text-gray-400">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-ocean-500/20 text-ocean-300 flex items-center justify-center text-sm font-bold">1</span>
            <span><strong className="text-white">Screenshot a deal</strong> — I'll OCR the image, extract prices and details, then match to your active packages.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-ocean-500/20 text-ocean-300 flex items-center justify-center text-sm font-bold">2</span>
            <span><strong className="text-white">Paste a URL</strong> — I'll visit the page, scrape prices and availability, then add to your package.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-ocean-500/20 text-ocean-300 flex items-center justify-center text-sm font-bold">3</span>
            <span><strong className="text-white">Write notes</strong> — "Found a $89/night hotel in Miami for Aug 22" and I'll build or update packages from it.</span>
          </li>
        </ol>

        <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-sm text-green-300 font-medium flex items-center gap-2">
            💡 Tip: You can also just message me on Telegram with a deal and I'll add it directly!
          </p>
        </div>
      </div>
    </section>
  );
}
