# ARA Desktop — AI Agent Platform

ARA is a macOS desktop application that wraps the [OpenClaw](https://github.com/openclaw/openclaw) AI gateway with a polished native UI. It gives non-technical users a zero-config AI agent platform that can hold phone calls, manage tasks, and act on their behalf — while giving power users full control over models, API keys, and agent configuration.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ARA Desktop (Electron)                    │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │  Renderer (React) │    │     Main Process (Node.js)   │  │
│  │                  │    │                              │  │
│  │  • Orchestrator  │◄──►│  • GatewayBridge (WS)        │  │
│  │  • Voice Panel   │IPC │  • OpenClaw subprocess       │  │
│  │  • Task Manager  │    │  • electron-store (settings) │  │
│  │  • Settings      │    │  • Tray icon                 │  │
│  └──────────────────┘    └──────────────────────────────┘  │
│                                    │                        │
│                                    ▼                        │
│                     ┌──────────────────────────┐           │
│                     │  OpenClaw Gateway         │           │
│                     │  ws://localhost:18789     │           │
│                     │  • Sessions / Agents      │           │
│                     │  • Cron jobs              │           │
│                     │  • TTS / STT              │           │
│                     │  • Node (OS actions)      │           │
│                     └──────────────────────────┘           │
│                                    │                        │
│                                    ▼                        │
│                     ┌──────────────────────────┐           │
│                     │  LLM Providers            │           │
│                     │  • OpenRouter (free tier) │           │
│                     │  • OpenAI / Anthropic     │           │
│                     │  • Google Gemini          │           │
│                     └──────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## Features

| Feature | Description |
|---|---|
| **Orchestrator Chat** | Lead LLM that can spawn specialized sub-agents for complex tasks |
| **Voice Agent** | Real-time TTS/STT with hold-monitoring — ARA waits on calls for you |
| **Task Manager** | Cron scheduler, task queue, OS action log with approval gate |
| **Settings** | API key config, model picker (free tier default), gateway status |
| **Zero-config mode** | Works out of the box with OpenRouter free tier — no API key required |
| **Managed billing** | Optional: ARA provisions dedicated keys and charges per usage |

---

## Getting Started

### Prerequisites

- macOS 12+ (Monterey or later)
- Node.js 18+
- npm 9+

### Development

```bash
# 1. Install dependencies
npm install

# 2. Bundle OpenClaw (run once)
./scripts/setup-vendor.sh

# 3. Start the development server
npm run dev
```

The app will open automatically. The renderer hot-reloads on file changes.

### Building for Distribution

```bash
# Build the renderer and main process
npm run build

# Package as .dmg (requires macOS)
npm run dist
```

The `.dmg` and `.zip` will be output to `dist/` for both `x64` (Intel) and `arm64` (Apple Silicon).

---

## Project Structure

```
ara-desktop/
├── src/
│   ├── main/
│   │   ├── main.ts              ← Electron main process
│   │   └── gateway-bridge.ts   ← WebSocket bridge to OpenClaw
│   ├── preload/
│   │   └── preload.ts          ← Secure IPC bridge (contextBridge)
│   ├── renderer/
│   │   ├── App.tsx             ← Root app shell + sidebar routing
│   │   └── main.tsx            ← React entry point
│   ├── components/
│   │   ├── chat/               ← OrchestratorChat
│   │   ├── voice/              ← VoicePanel
│   │   ├── tasks/              ← TaskManager
│   │   ├── settings/           ← SettingsPanel
│   │   └── onboarding/         ← OnboardingWizard
│   ├── hooks/
│   │   └── useGateway.ts       ← IPC event subscriptions + RPC helper
│   ├── store/
│   │   └── index.ts            ← Zustand global state
│   ├── styles/
│   │   └── index.css           ← Tailwind + ARA design tokens
│   └── types/
│       └── global.d.ts         ← window.ara type declarations
├── vendor/
│   └── openclaw/               ← Bundled OpenClaw gateway (after setup)
├── build/
│   └── entitlements.mac.plist  ← macOS hardened runtime entitlements
├── scripts/
│   └── setup-vendor.sh         ← OpenClaw vendor bundler
├── assets/                     ← App icons (.icns, tray PNG)
├── index.html                  ← Renderer HTML entry
├── vite.config.ts              ← Renderer build config
├── tsconfig.json               ← Renderer TypeScript config
├── tsconfig.main.json          ← Main process TypeScript config
└── tailwind.config.js          ← Tailwind design system
```

---

## LLM Configuration

ARA ships with a **free OpenRouter model** as the default — no API key required.

| Provider | Free tier | Key required |
|---|---|---|
| OpenRouter (Llama 3 8B) | ✅ Yes | No (uses ARA shared key) |
| OpenRouter (Mistral 7B) | ✅ Yes | No |
| OpenAI GPT-4o Mini | ❌ No | Yes |
| Anthropic Claude 3 Haiku | ❌ No | Yes |
| Google Gemini Flash | ❌ No | Yes |

Users can add their own keys in **Settings → API Keys** at any time. All keys are stored locally in the macOS Keychain via `electron-store` — never sent to ARA servers.

---

## Managed Billing (Phase 2)

In Phase 2, ARA Cloud will provision dedicated API keys per client and charge on usage. The billing infrastructure is a separate Docker-packaged service (`ara-cloud/`) that can be deployed to Fly.io, Railway, or any VPS.

---

## License

MIT
