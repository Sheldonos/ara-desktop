import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Zap, Shield, ChevronRight, Check,
  Bot, Mic, ListTodo, ArrowRight
} from "lucide-react";
import { useAppStore } from "../../store";

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to ARA",
    subtitle: "Your AI-powered relocation agent",
  },
  {
    id: "capabilities",
    title: "What ARA can do for you",
    subtitle: "Powered by advanced AI agents running on your Mac",
  },
  {
    id: "ready",
    title: "You're all set",
    subtitle: "ARA is starting up and ready to help",
  },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const { gateway } = useAppStore();

  const handleComplete = async () => {
    setCompleting(true);
    await window.ara.onboarding.complete();
    setTimeout(onComplete, 600);
  };

  return (
    <div className="fixed inset-0 bg-surface flex items-center justify-center z-50">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-ara-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-ara-800/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg mx-auto px-6">
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === step
                  ? "w-8 bg-ara-500"
                  : i < step
                  ? "w-4 bg-ara-700"
                  : "w-4 bg-white/10"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-ara-500 to-ara-700 flex items-center justify-center shadow-2xl shadow-ara-900/50">
                    <Bot className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-surface flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>

              <h1 className="text-4xl font-bold text-white mb-3">
                Welcome to <span className="text-ara-400">ARA</span>
              </h1>
              <p className="text-white/60 text-lg mb-2">
                Your AI-powered relocation agent
              </p>
              <p className="text-white/40 text-sm mb-10 max-w-sm mx-auto">
                ARA handles your entire move — utility transfers, address changes,
                vendor coordination, and more — automatically, while you focus on what matters.
              </p>

              {/* Free tier badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ara-900/50 border border-ara-700/50 text-ara-300 text-sm mb-10">
                <Zap className="w-3.5 h-3.5" />
                <span>Powered by Llama 3.3 — no API key required to get started</span>
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full py-4 rounded-2xl bg-ara-600 hover:bg-ara-500 text-white font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                Get started
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="capabilities"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-3xl font-bold text-white mb-2 text-center">
                What ARA does for you
              </h2>
              <p className="text-white/50 text-center mb-8">
                Intelligent agents working on your behalf, 24/7
              </p>

              <div className="space-y-3 mb-8">
                {[
                  {
                    icon: Bot,
                    color: "text-ara-400",
                    bg: "bg-ara-900/50",
                    title: "Lead Orchestrator",
                    desc: "One AI that understands your move and coordinates all the moving parts — automatically.",
                  },
                  {
                    icon: ListTodo,
                    color: "text-emerald-400",
                    bg: "bg-emerald-900/30",
                    title: "Automated Task Agents",
                    desc: "Specialist agents handle utility transfers, USPS changes, DMV updates, and ISP transfers without you lifting a finger.",
                  },
                  {
                    icon: Mic,
                    color: "text-violet-400",
                    bg: "bg-violet-900/30",
                    title: "Voice Agent",
                    desc: "ARA can wait on hold, make calls, and speak on your behalf — so you never have to sit through hold music again.",
                  },
                  {
                    icon: Shield,
                    color: "text-amber-400",
                    bg: "bg-amber-900/30",
                    title: "Runs on your Mac",
                    desc: "Everything runs locally. Your data never leaves your machine. You approve every action before it's taken.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/8"
                  >
                    <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{item.title}</p>
                      <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 font-medium transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-[2] py-3.5 rounded-2xl bg-ara-600 hover:bg-ara-500 text-white font-semibold transition-all flex items-center justify-center gap-2 group"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {/* Animated check */}
              <div className="flex justify-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-2xl shadow-emerald-900/50"
                >
                  <Check className="w-12 h-12 text-white" strokeWidth={3} />
                </motion.div>
              </div>

              <h2 className="text-3xl font-bold text-white mb-3">You're all set!</h2>
              <p className="text-white/50 mb-8 max-w-sm mx-auto">
                ARA is starting up in the background. You can begin your first relocation
                right away — no configuration needed.
              </p>

              {/* Gateway status */}
              <div className="flex items-center justify-center gap-2 mb-8 text-sm">
                <div
                  className={`w-2 h-2 rounded-full ${
                    gateway.ready ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"
                  }`}
                />
                <span className="text-white/50">
                  {gateway.ready ? "AI Gateway connected" : "AI Gateway starting..."}
                </span>
              </div>

              {/* Tips */}
              <div className="text-left space-y-2 mb-8 p-4 rounded-2xl bg-white/5 border border-white/8">
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3">Quick tips</p>
                {[
                  "Click \"New Relocation\" to start your first move",
                  "Add your own API key in Settings for GPT-4o quality",
                  "ARA lives in your menu bar — always one click away",
                ].map((tip) => (
                  <div key={tip} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-ara-500 mt-1.5 flex-shrink-0" />
                    <p className="text-white/60 text-sm">{tip}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleComplete}
                disabled={completing}
                className="w-full py-4 rounded-2xl bg-ara-600 hover:bg-ara-500 disabled:opacity-50 text-white font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {completing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Opening ARA...
                  </>
                ) : (
                  <>
                    Open ARA
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
