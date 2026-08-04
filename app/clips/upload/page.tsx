"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { addOperatorXp } from "@/utils/leveling";
import { Video, Upload, ArrowLeft, Loader2, CheckCircle2, Gamepad2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UploadClipPage() {
  const [title, setTitle] = useState("");
  const [gameTitle, setGameTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const router = useRouter();
  const supabase = createClient();

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim() || !gameTitle.trim()) {
      setErrorMessage("Please provide a title, game name, and select a video file.");
      return;
    }

    // 2MB Size Restriction Check (2 * 1024 * 1024 bytes)
    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage("File size exceeds 2MB limit! Please upload a compressed or smaller clip.");
      return;
    }

    setUploading(true);
    setErrorMessage("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Operator telemetry session not found. Please log in.");
      }

      // 1. Upload Video File to Supabase Storage bucket 'clips'
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("clips")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get Public URL for the uploaded video file
      const { data: { publicUrl: videoUrl } } = supabase.storage
        .from("clips")
        .getPublicUrl(filePath);

      // 2. Insert record into database clips table
      const { error: dbError } = await supabase
        .from("clips")
        .insert({
          user_id: user.id,
          title: title.trim(),
          game_title: gameTitle.trim(),
          video_url: videoUrl,
          upvotes_count: 0,
        });

      if (dbError) throw dbError;

      // 3. Reward +25 XP for uploading a highlight reel
      await addOperatorXp(user.id, 25);

      router.push("/clips");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload telemetry clip.");
      setUploading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#060b14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 w-full space-y-6 sm:space-y-8">
        
        <div className="space-y-3 sm:space-y-4">
          <Link 
            href="/clips"
            className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Shorts Feed
          </Link>

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#0b1324] border border-cyan-500/40 text-xs font-mono text-cyan-400 mb-2 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Video className="w-3.5 h-3.5 text-cyan-400" />
              <span>STUDIO_MATRIX // UPLOAD_SHORT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Upload Short Reel</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Broadcast your vertical gameplay clip. <span className="text-cyan-400 font-bold">Max file size: 2MB.</span> Earn +25 XP upon deployment.
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-8 rounded-2xl bg-[#0b1324] border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-lg bg-red-950/60 border border-red-500/40 text-xs font-mono text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              ERROR_LOG: {errorMessage}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-5 sm:space-y-6">
            
            {/* Title Input */}
            <div className="space-y-2">
              <label className="block text-xs font-mono text-cyan-400 uppercase tracking-wider">
                Clip Designation / Title <span className="text-cyan-500">*</span>
              </label>
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 1v4 Clutch Ace on Ascent B-Site"
                required
                className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-[#060b14] border border-cyan-500/30 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs sm:text-sm shadow-inner"
              />
            </div>

            {/* Game Title Input */}
            <div className="space-y-2">
              <label className="block text-xs font-mono text-cyan-400 uppercase tracking-wider">
                Game Title <span className="text-cyan-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-500/60">
                  <Gamepad2 className="w-4 h-4" />
                </span>
                <input 
                  type="text"
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  placeholder="e.g. Valorant, Counter-Strike 2, Apex Legends"
                  required
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-lg bg-[#060b14] border border-cyan-500/30 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs sm:text-sm shadow-inner"
                />
              </div>
            </div>

            {/* Video File Upload Box */}
            <div className="space-y-2">
              <label className="block text-xs font-mono text-cyan-400 uppercase tracking-wider">
                Vertical Video File (MP4 / WebM) <span className="text-cyan-500">*</span>
              </label>
              <div className="p-4 sm:p-6 rounded-xl bg-[#060b14] border border-dashed border-cyan-500/40 text-center hover:border-cyan-500 transition-colors relative cursor-pointer">
                <input 
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-cyan-400 mx-auto opacity-80" />
                  <p className="text-xs sm:text-sm font-bold text-white truncate px-2">
                    {file ? `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)` : "Drop vertical short video here (Max 2MB)"}
                  </p>
                  <p className="text-[11px] sm:text-xs font-mono text-amber-400/90">Strict Limit: File must be under 2MB</p>
                </div>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={uploading}
              className="w-full py-3 sm:py-3.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs sm:text-sm tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>UPLOADING_SHORT...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Broadcast Short & Earn XP</span>
                </>
              )}
            </button>

          </form>
        </div>

      </main>
    </div>
  );
}
