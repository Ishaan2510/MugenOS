"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

// ============================================================
// CONFIGURE EVERYTHING HERE
// ============================================================

const USER_NAME = "Ishaan";

// Video playlists grouped by anime.
// Put all .mp4 files in the public/ folder.
// Selecting a group plays its clips one after another, then loops.
const PLAYLISTS = [
  { name: "Blue Lock", videos: ["isagi.mp4", "nagi.mp4"] },
  { name: "One Piece", videos: ["zoro_1.mp4", "luffy_1.mp4", "luffy_2.mp4"] },
  { name: "AOT", videos: ["eren_1.mp4", "eren_2.mp4"] },
  { name: "Vibes", videos: ["all the way.mp4"] },
];

// Music tracks. Put .mp3 files in public/music/ folder.
// Leave this as [] to hide the music player entirely.
const MUSIC: { name: string; file: string }[] = [
  // { name: "Unravel", file: "music/unravel.mp3" },
  // { name: "Blue Bird", file: "music/blue_bird.mp3" },
];

// Quick-access links (top-left). Add as many as you want.
// Example: { name: "HackerRank", url: "https://hackerrank.com/...", tag: "HR" }
const LINKS = [
  { name: "GitHub", url: "https://github.com/Ishaan2510", tag: "GH" },
  { name: "LeetCode", url: "https://leetcode.com/u/ishaan_102/", tag: "LC" },
  { name: "Codeforces", url: "https://codeforces.com/profile/ishaan_102", tag: "CF" },
];

const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Great ideas are forged, not found.", author: "Farza" },
  { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { text: "The best way to predict the future is to invent it.", author: "Alan Kay" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
  { text: "Time is your most valuable asset. Don't waste it.", author: "" },
];

// ============================================================

type Todo = { id: number; text: string; done: boolean };
let nextTodoId = 0;

const Home: React.FC = () => {
  const [now, setNow] = useState(new Date());
  const [qIdx, setQIdx] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Video playlist
  const [plIdx, setPlIdx] = useState(0);
  const [vidIdx, setVidIdx] = useState(0);
  const [plOpen, setPlOpen] = useState(false);
  const [singleClip, setSingleClip] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Music
  const [mIdx, setMIdx] = useState(0);
  const [mPlaying, setMPlaying] = useState(false);
  const [mOpen, setMOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Pomodoro
  const [workMins, setWorkMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [pomSec, setPomSec] = useState(25 * 60);
  const [pomOn, setPomOn] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [flash, setFlash] = useState(false);
  const isBreakRef = useRef(false);

  // Todo
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todoInput, setTodoInput] = useState("");

  // Grain
  const [noiseUrl, setNoiseUrl] = useState("");

  const currentPl = PLAYLISTS[plIdx];
  const currentSrc = `./${currentPl.videos[vidIdx]}`;

  // ---- EFFECTS ----

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const c = document.createElement("canvas");
    c.width = 200; c.height = 200;
    const ctx = c.getContext("2d")!;
    const d = ctx.createImageData(200, 200);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 45;
    }
    ctx.putImageData(d, 0, 0);
    setNoiseUrl(c.toDataURL());
  }, []);

  useEffect(() => { setQIdx(Math.floor(Math.random() * QUOTES.length)); }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { isBreakRef.current = isBreak; }, [isBreak]);

  useEffect(() => {
    if (!pomOn) return;
    const id = setInterval(() => {
      setPomSec((p) => {
        if (p <= 1) {
          setFlash(true);
          playChime();
          setTimeout(() => setFlash(false), 600);
          const wasBreak = isBreakRef.current;
          const goingToBreak = !wasBreak;
          setIsBreak(goingToBreak);
          isBreakRef.current = goingToBreak;
          if (wasBreak) { setCycles((c) => c + 1); return workMins * 60; }
          return breakMins * 60;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [pomOn, workMins, breakMins]);

  // Reset video index when playlist changes
  useEffect(() => { setVidIdx(0); }, [plIdx]);

  // Load new video when vidIdx or plIdx changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [vidIdx, plIdx]);

  // Chime sound (Web Audio API, no file needed)
  const playChime = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const beep = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.2, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      beep(880, 0, 0.15);
      beep(1100, 0.2, 0.4);
    } catch {}
  }, []);

  // ---- HANDLERS ----

  const handleVideoEnded = useCallback(() => {
    setVidIdx((prev) => (prev + 1) % PLAYLISTS[plIdx].videos.length);
  }, [plIdx]);

  const selectPl = (i: number) => { setSingleClip(null); setPlIdx(i); setPlOpen(false); };
  const selectClip = (filename: string) => { setSingleClip(filename); setPlOpen(false); };

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (mPlaying) { audioRef.current.pause(); }
    else { audioRef.current.play().catch(() => {}); }
    setMPlaying(!mPlaying);
  };

  const nextSong = () => {
    const next = (mIdx + 1) % MUSIC.length;
    setMIdx(next);
    setMPlaying(true);
    setTimeout(() => { audioRef.current?.load(); audioRef.current?.play().catch(() => {}); }, 50);
  };

  const selectSong = (i: number) => {
    setMIdx(i); setMPlaying(true); setMOpen(false);
    setTimeout(() => { audioRef.current?.load(); audioRef.current?.play().catch(() => {}); }, 50);
  };

  const resetPom = () => {
    setPomOn(false); setIsBreak(false); isBreakRef.current = false;
    setPomSec(workMins * 60); setCycles(0);
  };

  const applySettings = (wm: number, bm: number) => {
    setWorkMins(wm); setBreakMins(bm);
    if (!pomOn) setPomSec(isBreak ? bm * 60 : wm * 60);
  };

  const addTodo = () => {
    const t = todoInput.trim(); if (!t) return;
    setTodos((prev) => [...prev, { id: ++nextTodoId, text: t, done: false }]);
    setTodoInput("");
  };

  const toggleTodo = (id: number) =>
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const deleteTodo = (id: number) =>
    setTodos((prev) => prev.filter((t) => t.id !== id));
  const clearDone = () => setTodos((prev) => prev.filter((t) => !t.done));

  // ---- COMPUTED ----

  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 5) return "Late night grind"; if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon"; if (h < 21) return "Good evening";
    return "Night owl mode";
  }, [now]);

  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const pomMin = String(Math.floor(pomSec / 60)).padStart(2, "0");
  const pomSecStr = String(pomSec % 60).padStart(2, "0");
  const pomTotal = isBreak ? breakMins * 60 : workMins * 60;
  const pomProg = pomTotal > 0 ? 1 - pomSec / pomTotal : 0;
  const pomR = 65; const pomCirc = 2 * Math.PI * pomR;
  const activeColor = isBreak ? "#39ff14" : "#ff2d7b";
  const doneCount = todos.filter((t) => t.done).length;

  return (
    <main className="dashboard">
      <video ref={videoRef} key={singleClip || `${plIdx}-${vidIdx}`}
        src={singleClip ? `./${singleClip}` : currentSrc}
        autoPlay muted playsInline
        loop={!!singleClip}
        onEnded={singleClip ? undefined : handleVideoEnded}
        className="video-bg" />

      {MUSIC.length > 0 && <audio ref={audioRef} src={`./${MUSIC[mIdx].file}`} onEnded={nextSong} />}

      {noiseUrl && <div className="grain-overlay" style={{ backgroundImage: `url(${noiseUrl})` }} />}
      <div className="scanlines" />
      {flash && <div className="flash-overlay" style={{ background: activeColor }} />}

      <div className="content-layer">
        {/* TOP BAR */}
        <div className="top-bar fade-up">
          <div className="links-row">
            {LINKS.map((l) => (
              <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer" className="link-pill">
                <span className="link-tag">{l.tag}</span><span>{l.name}</span>
              </a>
            ))}
          </div>
          <div className="date-text">{mounted ? dateStr : "\u00A0"}</div>
        </div>

        {/* CENTER */}
        <div className="hero fade-up-delayed">
          <div className="clock-row">
            <span className="clock-main">{mounted ? timeStr : "--:--"}</span>
            <span className="clock-sec">{mounted ? `:${seconds}` : ""}</span>
          </div>
          <div className="greeting">{mounted ? `${greeting}, ${USER_NAME}` : "\u00A0"}</div>
        </div>

        {/* WIDGETS */}
        <div className="widget-row fade-up-delayed-2">
          {/* POMODORO */}
          <div className="glass-card">
            <div className="widget-header">
              <span className="widget-label" style={{ color: activeColor, textShadow: `0 0 8px ${activeColor}44` }}>
                {isBreak ? "// BREAK" : "// FOCUS"}
              </span>
              <div className="widget-header-right">
                {cycles > 0 && <span className="muted-text">{cycles} done</span>}
                <button className="btn-ghost" onClick={() => setShowSettings((s) => !s)}
                  style={{ color: showSettings ? "#00e5ff" : undefined }}>
                  {showSettings ? "CLOSE" : "SET"}
                </button>
              </div>
            </div>
            {showSettings && (
              <div className="settings-panel">
                <div className="setting-group">
                  <span className="setting-label">WORK</span>
                  <input type="number" className="setting-input" value={workMins} min={1} max={120}
                    onChange={(e) => applySettings(Math.max(1, Math.min(120, +e.target.value || 1)), breakMins)} />
                  <span className="dim-text">min</span>
                </div>
                <div className="setting-group">
                  <span className="setting-label">BREAK</span>
                  <input type="number" className="setting-input" value={breakMins} min={1} max={60}
                    onChange={(e) => applySettings(workMins, Math.max(1, Math.min(60, +e.target.value || 1)))} />
                  <span className="dim-text">min</span>
                </div>
              </div>
            )}
            <div className="timer-ring-container">
              <svg width="130" height="130" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="65" cy="65" r={pomR} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="2.5" />
                <circle cx="65" cy="65" r={pomR} fill="none" stroke={activeColor} strokeWidth="2.5"
                  strokeLinecap="round" strokeDasharray={pomCirc} strokeDashoffset={pomCirc * (1 - pomProg)}
                  style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 6px ${activeColor}88)` }} />
                <text x="65" y="69" textAnchor="middle" fill="#d4d4d8" fontSize="28" fontFamily="inherit"
                  style={{ transform: "rotate(90deg)", transformOrigin: "65px 65px" }}>
                  {pomMin}:{pomSecStr}
                </text>
              </svg>
            </div>
            <div className="pom-controls">
              <button className="btn-ghost" onClick={() => setPomOn((r) => !r)}
                style={{ color: pomOn ? "#ff2d7b" : "#39ff14", borderColor: pomOn ? "rgba(255,45,123,0.2)" : "rgba(57,255,20,0.2)" }}>
                {pomOn ? "PAUSE" : "START"}
              </button>
              <button className="btn-ghost" onClick={resetPom}>RESET</button>
            </div>
          </div>

          {/* TODO */}
          <div className="glass-card todo-card">
            <div className="widget-header">
              <span className="widget-label" style={{ color: "#00e5ff" }}>// TODO</span>
              <div className="widget-header-right">
                {doneCount > 0 && <button className="btn-ghost" onClick={clearDone}>CLEAR {doneCount} DONE</button>}
                <span className="dim-text">{todos.length} items</span>
              </div>
            </div>
            <div className="todo-input-row">
              <input value={todoInput} onChange={(e) => setTodoInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTodo()} placeholder="add a task..." className="todo-input" />
              <button className="btn-ghost" onClick={addTodo}>+</button>
            </div>
            <div className="todo-list">
              {todos.length === 0 ? (
                <div className="todo-empty">nothing here yet</div>
              ) : todos.map((t) => (
                <div key={t.id} className="todo-item">
                  <div className={`todo-cb ${t.done ? "done" : ""}`} onClick={() => toggleTodo(t.id)}>
                    {t.done && <span className="check-mark">&#10003;</span>}
                  </div>
                  <span className="todo-text" style={{
                    textDecoration: t.done ? "line-through" : "none",
                    opacity: t.done ? 0.3 : 0.8, color: t.done ? "#52525b" : "#d4d4d8",
                  }}>{t.text}</span>
                  <button className="todo-del" onClick={() => deleteTodo(t.id)}>x</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        

        {/* BOTTOM BAR */}
        <div className="bottom-bar fade-up-delayed-3">
          {/* Music (left) */}
          <div className="bar-section" style={{ position: "relative" }}>
            {MUSIC.length > 0 && <>
              <button className="ctrl-btn" onClick={toggleMusic}>{mPlaying ? "||" : "\u25B6"}</button>
              <button className="ctrl-btn" onClick={nextSong}>{"\u25B6\u25B6"}</button>
              <span className="ctrl-label" onClick={() => setMOpen((o) => !o)}
                style={{ cursor: "pointer" }}>{MUSIC[mIdx].name}</span>
              {mOpen && (
                <div className="selector-panel" style={{ bottom: "100%", left: 0, marginBottom: 8 }}>
                  <div className="selector-title">TRACKS</div>
                  {MUSIC.map((m, i) => (
                    <div key={i} className={`selector-item ${i === mIdx ? "active" : ""}`}
                      onClick={() => selectSong(i)}>
                      <span className="selector-dot" style={{
                        background: i === mIdx && mPlaying ? "#39ff14" : "#333",
                        boxShadow: i === mIdx && mPlaying ? "0 0 4px #39ff14" : "none",
                      }} />
                      <span>{m.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </>}
          </div>

          {/* Quote (center) */}
          <div className="bottom-quote">
            {mounted && <>&ldquo;{QUOTES[qIdx].text}&rdquo;{QUOTES[qIdx].author && <> &mdash; {QUOTES[qIdx].author}</>}</>}
          </div>

          {/* Playlist (right) */}
          <div className="bar-section" style={{ position: "relative" }}>
            <span className="ctrl-label" onClick={() => setPlOpen((o) => !o)}
              style={{ cursor: "pointer" }}>{currentPl.name}</span>
            <button className="ctrl-btn" onClick={() => setPlOpen((o) => !o)}>
              <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round">
                <line x1="3" y1="5" x2="17" y2="5" /><line x1="3" y1="10" x2="12" y2="10" />
                <line x1="3" y1="15" x2="17" y2="15" />
                <polygon points="15,8 15,12 19,10" fill="currentColor" stroke="none" />
              </svg>
            </button>
            {plOpen && (
              <div className="selector-panel" style={{ bottom: "100%", right: 0, marginBottom: 8 }}>
                <div className="selector-title">WALLPAPERS</div>
                {PLAYLISTS.map((p, i) => (
                  <div key={i}>
                    <div className={`selector-item ${i === plIdx && !singleClip ? "active" : ""}`}
                      onClick={() => selectPl(i)}>
                      <span className="selector-dot" style={{
                        background: i === plIdx && !singleClip ? "#00e5ff" : "#333",
                        boxShadow: i === plIdx && !singleClip ? "0 0 4px #00e5ff" : "none",
                      }} />
                      <span>{p.name}</span>
                      <span style={{ marginLeft: "auto", fontSize: 12, color: "#333" }}>
                        {p.videos.length}
                      </span>
                    </div>
                    {p.videos.map((v, vi) => (
                      <div key={vi}
                        className={`selector-item selector-subitem ${singleClip === v ? "active" : ""}`}
                        onClick={() => selectClip(v)}>
                        <span className="selector-dot" style={{
                          width: 5, height: 5,
                          background: singleClip === v ? "#39ff14" : "#222",
                          boxShadow: singleClip === v ? "0 0 4px #39ff14" : "none",
                        }} />
                        <span>{v.replace(".mp4", "")}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home;