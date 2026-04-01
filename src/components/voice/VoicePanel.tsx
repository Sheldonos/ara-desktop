import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff,
  PhoneCall, Clock, Loader2, Waves, Settings2,
  ChevronDown, Radio, AlertCircle
} from "lucide-react";
import { useAppStore } from "../../store";
import { useGateway } from "../../hooks/useGateway";

// ─── Voice waveform visualizer ────────────────────────────────────────────────

function WaveformVisualizer({ active, color = "ara" }: { active: boolean; color?: string }) {
  const bars = 20;
  return (
    <div className="flex items-center justify-center gap-0.5 h-12">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className={`w-1 rounded-full ${
            color === "ara" ? "bg-ara-500" : "bg-emerald-500"
          }`}
          animate={
            active
              ? {
                  height: [4, Math.random() * 32 + 8, 4],
                  opacity: [0.4, 1, 0.4],
                }
              : { height: 4, opacity: 0.2 }
          }
          transition={{
            duration: 0.8 + Math.random() * 0.4,
            repeat: Infinity,
            delay: i * 0.05,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Transcript line ──────────────────────────────────────────────────────────

interface TranscriptLine {
  id: string;
  speaker: "user" | "agent" | "system" | "hold";
  text: string;
  timestamp: number;
}

function TranscriptEntry({ line }: { line: TranscriptLine }) {
  const colors = {
    user: "text-white/80",
    agent: "text-ara-300",
    system: "text-white/30 italic text-xs",
    hold: "text-amber-400/70 text-xs",
  };

  const labels = {
    user: "You",
    agent: "ARA",
    system: "",
    hold: "⏳ On hold",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 py-1.5"
    >
      {line.speaker !== "system" && line.speaker !== "hold" && (
        <span className={`text-xs font-medium w-8 flex-shrink-0 mt-0.5 ${
          line.speaker === "user" ? "text-white/40" : "text-ara-500"
        }`}>
          {labels[line.speaker]}
        </span>
      )}
      <span className={`text-sm leading-relaxed flex-1 ${colors[line.speaker]}`}>
        {line.speaker === "hold" && (
          <span className="mr-2">{labels.hold}</span>
        )}
        {line.text}
      </span>
      <span className="text-xs text-white/20 flex-shrink-0 mt-0.5">
        {new Date(line.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
    </motion.div>
  );
}

// ─── Main VoicePanel ──────────────────────────────────────────────────────────

const VOICE_OPTIONS = [
  { id: "alloy", label: "Alloy", desc: "Neutral, clear" },
  { id: "echo", label: "Echo", desc: "Warm, conversational" },
  { id: "fable", label: "Fable", desc: "Expressive, British" },
  { id: "onyx", label: "Onyx", desc: "Deep, authoritative" },
  { id: "nova", label: "Nova", desc: "Bright, energetic" },
  { id: "shimmer", label: "Shimmer", desc: "Soft, friendly" },
];

const DEMO_TRANSCRIPT: TranscriptLine[] = [
  { id: "1", speaker: "system", text: "Call started — Pacific Gas & Electric customer service", timestamp: Date.now() - 120000 },
  { id: "2", speaker: "agent", text: "Thank you for calling Pacific Gas & Electric. How can I help you today?", timestamp: Date.now() - 115000 },
  { id: "3", speaker: "user", text: "Hi, I'm calling to transfer my service to a new address.", timestamp: Date.now() - 110000 },
  { id: "4", speaker: "agent", text: "I'd be happy to help with that. Can I get your current account number?", timestamp: Date.now() - 105000 },
  { id: "5", speaker: "hold", text: "Transferred to account services department...", timestamp: Date.now() - 90000 },
  { id: "6", speaker: "system", text: "Hold music playing — estimated wait 4 minutes", timestamp: Date.now() - 88000 },
];

export function VoicePanel() {
  const { voice, setVoice, gateway } = useAppStore();
  const { rpc } = useGateway();

  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [callActive, setCallActive] = useState(false);
  const [holdMode, setHoldMode] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [inputText, setInputText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recognition, setRecognition] = useState<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Call timer
  useEffect(() => {
    if (callActive) {
      callTimerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [callActive]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const startListening = useCallback(async () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      addTranscriptLine("system", "Speech recognition not available in this browser.");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionCtor = w.webkitSpeechRecognition || w.SpeechRecognition;
    const rec = new SpeechRecognitionCtor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const text = last[0].transcript.trim();
        if (text) {
          addTranscriptLine("user", text);
          // Send to voice agent
          if (gateway.ready) {
            rpc("talk.speak", { text, voice: voice.voice }).catch(console.error);
          }
        }
      }
    };

    rec.onerror = (e: any) => {
      console.error("Speech recognition error:", e.error);
      setVoice({ isListening: false });
    };

    rec.onend = () => setVoice({ isListening: false });

    rec.start();
    setRecognition(rec);
    setVoice({ isListening: true });
  }, [gateway.ready, rpc, voice.voice, setVoice]);

  const stopListening = useCallback(() => {
    recognition?.stop();
    setRecognition(null);
    setVoice({ isListening: false });
  }, [recognition, setVoice]);

  const toggleListening = () => {
    if (voice.isListening) stopListening();
    else startListening();
  };

  const speakText = async (text: string) => {
    if (!text.trim()) return;
    setSpeaking(true);
    addTranscriptLine("agent", text);

    try {
      if (gateway.ready) {
        await rpc("talk.speak", { text, voice: voice.voice });
      } else {
        // Browser TTS fallback
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
        return;
      }
    } catch (err) {
      console.error("TTS error:", err);
    } finally {
      setSpeaking(false);
    }
  };

  const startCall = () => {
    setCallActive(true);
    setTranscript([]);
    addTranscriptLine("system", "Voice session started — ARA is ready");
    setVoice({ enabled: true });
  };

  const endCall = () => {
    setCallActive(false);
    setHoldMode(false);
    stopListening();
    setVoice({ enabled: false, isListening: false, isSpeaking: false });
    addTranscriptLine("system", `Session ended — duration ${formatDuration(callDuration)}`);
  };

  const toggleHoldMode = () => {
    setHoldMode(!holdMode);
    if (!holdMode) {
      addTranscriptLine("hold", "ARA is monitoring the line and will alert you when a human answers.");
    } else {
      addTranscriptLine("system", "Hold monitoring deactivated.");
    }
  };

  const loadDemoTranscript = () => {
    setTranscript(DEMO_TRANSCRIPT);
    setCallActive(true);
  };

  const addTranscriptLine = (
    speaker: TranscriptLine["speaker"],
    text: string
  ) => {
    setTranscript((prev) => [
      ...prev,
      { id: `line-${Date.now()}-${Math.random()}`, speaker, text, timestamp: Date.now() },
    ]);
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
        <div>
          <h1 className="text-lg font-semibold text-white">Voice Agent</h1>
          <p className="text-xs text-white/40 mt-0.5">
            ARA can speak, listen, and wait on hold on your behalf
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-xl transition-all ${
            showSettings ? "bg-ara-700 text-ara-300" : "hover:bg-white/8 text-white/40"
          }`}
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Main voice area */}
        <div className="flex-1 flex flex-col">
          {/* Voice visualizer + controls */}
          <div className="px-6 py-6 border-b border-white/8">
            {/* Status */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div
                className={`w-2 h-2 rounded-full ${
                  callActive
                    ? holdMode
                      ? "bg-amber-400 animate-pulse"
                      : "bg-emerald-400 animate-pulse"
                    : "bg-white/20"
                }`}
              />
              <span className="text-sm text-white/50">
                {callActive
                  ? holdMode
                    ? `On hold — monitoring... ${formatDuration(callDuration)}`
                    : `Active — ${formatDuration(callDuration)}`
                  : "Ready"}
              </span>
            </div>

            {/* Waveform */}
            <div className="flex justify-center mb-6">
              <WaveformVisualizer
                active={callActive && !holdMode}
                color={holdMode ? "emerald" : "ara"}
              />
            </div>

            {/* Main controls */}
            <div className="flex items-center justify-center gap-4">
              {/* Mic toggle */}
              <button
                onClick={toggleListening}
                disabled={!callActive}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  voice.isListening
                    ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-900/50"
                    : "bg-white/10 hover:bg-white/15 disabled:opacity-30"
                }`}
              >
                {voice.isListening ? (
                  <MicOff className="w-5 h-5 text-white" />
                ) : (
                  <Mic className="w-5 h-5 text-white/70" />
                )}
              </button>

              {/* Call button */}
              <button
                onClick={callActive ? endCall : startCall}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl ${
                  callActive
                    ? "bg-red-500 hover:bg-red-600 shadow-red-900/50"
                    : "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-900/50"
                }`}
              >
                {callActive ? (
                  <PhoneOff className="w-7 h-7 text-white" />
                ) : (
                  <Phone className="w-7 h-7 text-white" />
                )}
              </button>

              {/* Hold mode */}
              <button
                onClick={toggleHoldMode}
                disabled={!callActive}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  holdMode
                    ? "bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-900/50"
                    : "bg-white/10 hover:bg-white/15 disabled:opacity-30"
                }`}
                title="Hold monitoring — ARA waits on hold and alerts you"
              >
                <Clock className="w-5 h-5 text-white/70" />
              </button>
            </div>

            {/* Hold mode explanation */}
            <AnimatePresence>
              {holdMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-3 rounded-xl bg-amber-900/20 border border-amber-700/30 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-amber-400 text-sm">
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>ARA is monitoring the line — you'll be notified when a human answers</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick speak */}
            {callActive && (
              <div className="mt-4 flex gap-2">
                <input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      speakText(inputText);
                      setInputText("");
                    }
                  }}
                  placeholder="Type for ARA to speak..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-ara-500/50"
                />
                <button
                  onClick={() => { speakText(inputText); setInputText(""); }}
                  disabled={!inputText.trim() || speaking}
                  className="px-4 py-2 rounded-xl bg-ara-600 hover:bg-ara-500 disabled:opacity-30 text-white text-sm font-medium transition-all flex items-center gap-2"
                >
                  {speaking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                  Speak
                </button>
              </div>
            )}

            {/* Demo button */}
            {!callActive && (
              <div className="mt-4 text-center">
                <button
                  onClick={loadDemoTranscript}
                  className="text-xs text-white/30 hover:text-white/50 underline transition-colors"
                >
                  Load demo transcript
                </button>
              </div>
            )}
          </div>

          {/* Transcript */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Transcript
              </h3>
              {transcript.length > 0 && (
                <button
                  onClick={() => setTranscript([])}
                  className="text-xs text-white/25 hover:text-white/50 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {transcript.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Waves className="w-8 h-8 text-white/15 mb-3" />
                <p className="text-sm text-white/30">
                  Transcript will appear here during a voice session
                </p>
                <p className="text-xs text-white/20 mt-1">
                  ARA can speak, listen, and wait on hold for you
                </p>
              </div>
            ) : (
              <div className="space-y-0.5 divide-y divide-white/5">
                {transcript.map((line) => (
                  <TranscriptEntry key={line.id} line={line} />
                ))}
                <div ref={transcriptEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Settings panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-white/8 overflow-hidden flex-shrink-0"
            >
              <div className="p-4 w-[260px]">
                <h3 className="text-sm font-medium text-white mb-4">Voice Settings</h3>

                {/* TTS Provider */}
                <div className="mb-4">
                  <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">
                    TTS Provider
                  </label>
                  <select
                    value={voice.provider}
                    onChange={(e) => setVoice({ provider: e.target.value as "openai" | "elevenlabs" | "deepgram" })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-ara-500"
                  >
                    <option value="openai">OpenAI TTS</option>
                    <option value="elevenlabs">ElevenLabs</option>
                    <option value="deepgram">Deepgram</option>
                  </select>
                </div>

                {/* Voice selection */}
                <div className="mb-4">
                  <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">
                    Voice
                  </label>
                  <div className="space-y-1.5">
                    {VOICE_OPTIONS.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setVoice({ voice: v.id })}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${
                          voice.voice === v.id
                            ? "bg-ara-700 border border-ara-600 text-white"
                            : "bg-white/5 border border-white/8 text-white/60 hover:bg-white/10"
                        }`}
                      >
                        <span>{v.label}</span>
                        <span className="text-xs text-white/30">{v.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hold detection */}
                <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-700/30">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-amber-400 font-medium">Hold Detection</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        ARA uses audio analysis to detect when hold music ends and a human answers.
                        Requires OpenAI TTS provider.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
