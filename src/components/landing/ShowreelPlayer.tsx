"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * The product video: files in `public/video/`. The browser takes the MP4 and falls back to the WebM.
 * The files are cached for a day, so bump VERSION whenever they are replaced — it makes every browser fetch the new ones.
 */
const VERSION = 2;
const VIDEO = { mp4: `/video/showreel.mp4?v=${VERSION}`, webm: `/video/showreel.webm?v=${VERSION}`, poster: `/video/showreel-poster.jpg?v=${VERSION}` };

const clock = (s: number) => {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

/**
 * The video in the page is a still frame with one play button. Pressing it opens a large window that fills the screen
 * and plays the video there; the player's own controls stay hidden until the pointer is over the video.
 */
export function ShowreelPlayer() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Play the product video"
        className="group relative block aspect-video w-full overflow-hidden rounded-3xl border bg-black shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={VIDEO.poster} alt="" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
        <span aria-hidden className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20" />
        <span className="absolute right-4 bottom-4 flex items-center gap-2.5 rounded-full bg-white/95 py-1.5 pr-4 pl-1.5 text-sm font-medium text-black shadow-xl transition-transform duration-200 group-hover:scale-105 md:right-5 md:bottom-5">
          <span className="grid size-9 place-items-center rounded-full bg-black text-white">
            <Play className="ml-0.5 size-4 fill-current" />
          </span>
          Watch the video
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="top-1/2 w-[min(96vw,calc(88dvh*16/9),1500px)] max-w-none gap-0 overflow-hidden rounded-2xl border-0 bg-black p-0 shadow-[0_0_0_100vmax_rgba(0,0,0,0.8)] sm:max-w-none [&>[data-slot=dialog-close]]:z-20 [&>[data-slot=dialog-close]]:bg-black/50 [&>[data-slot=dialog-close]]:text-white"
        >
          <DialogTitle className="sr-only">Backlink Market product video</DialogTitle>
          <ModalVideo />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ModalVideo() {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    // play() can be cut short (the window closes, the browser pauses a hidden video): that is not an error worth reporting
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  // Space plays and pauses, like everywhere else
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div ref={wrap} className="group relative aspect-video w-full bg-black">
      <video
        ref={video}
        className="size-full cursor-pointer object-contain"
        poster={VIDEO.poster}
        autoPlay
        playsInline
        preload="auto"
        muted={muted}
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        aria-label="Backlink Market product video"
      >
        {/* MP4 (H.264) first: every browser and device plays it. Some browsers claim to play WebM and then show black frames. */}
        <source src={VIDEO.mp4} type="video/mp4" />
        <source src={VIDEO.webm} type="video/webm" />
      </video>

      {/* Paused: one clear way back in. Playing: nothing at all until the pointer comes over the video. */}
      {!playing && (
        <button type="button" onClick={toggle} aria-label="Play" className="absolute inset-0 m-auto grid size-20 place-items-center rounded-full bg-white/95 text-black shadow-xl">
          <Play className="ml-1 size-8 fill-current" />
        </button>
      )}

      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pt-12 pb-3 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100", !playing && "pointer-events-auto opacity-100")}>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          aria-label="Seek"
          onChange={(e) => {
            const v = video.current;
            if (v) v.currentTime = Number(e.target.value);
          }}
          className="h-1 w-full cursor-pointer accent-white"
        />
        <div className="flex items-center gap-3 text-white">
          <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="grid size-9 place-items-center rounded-full hover:bg-white/15">
            {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
          </button>
          <span className="text-xs tabular-nums">
            {clock(time)} / {clock(duration)}
          </span>
          <span className="flex-1" />
          <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"} className="grid size-9 place-items-center rounded-full hover:bg-white/15">
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <button type="button" onClick={() => wrap.current?.requestFullscreen?.().catch(() => {})} aria-label="Full screen" className="grid size-9 place-items-center rounded-full hover:bg-white/15">
            <Maximize className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
