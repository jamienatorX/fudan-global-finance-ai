# Fufu Live Dictation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Show Chinese and English words while users speak, without a paid service or speech backend.

**Architecture:** A dedicated Sherpa-ONNX worker consumes incremental 16 kHz PCM from an AudioWorklet. Versioned static model shards load on explicit microphone use; the current Whisper workflow remains an explicit fallback. Provisional text appears beside the composer and only final text enters its existing onText callback.

**Tech Stack:** Existing Next.js/React/TypeScript, browser AudioWorklet, Web Worker, Cache API, Sherpa-ONNX 1.12.20, Vitest and Playwright.

**Spec:** docs/superpowers/specs/2026-10-24-fufu-live-dictation-design.md

## Global Constraints

- Keep MAX_VOICE_SECONDS=120 and VOICE_SAMPLE_RATE=16000.
- No language selector, paid provider, speech server, automatic Send or banking authorization.
- Explicit first-use preparation with progress and cancellation; no homepage model download.
- Preserve full transcripts and existing 1,000-character Send guard.
- Pin archive SHA-256 E889207CD6A84973CBC028C05115CDD778AE8E277867B83169644BE5B3A63C53; generated static shards stay under 32 MB; binaries stay out of Git.
- Preserve engine and model notices; resolve redistribution permission before publishing assets.
- Release microphone resources on cancellation, errors and navigation; ignore stale responses.

## Review Focus

- Cancel followed immediately by restart must not insert a late result from the previous session (Task 3).
- Cache quota refusal or corrupt shards must not prevent an uncached retry or explicit fallback (Task 1).
- Slow devices must report overload rather than silently discard audio (Task 2).
- Silence and repeated utterances must not duplicate words or invent a final message (Tasks 2–3).
- Existing typed text and transcripts exceeding 1,000 characters must survive finalization (Task 3).

## Task 1: Reproducible static speech assets

**Files:** Create scripts/prepare-voice-stream.mjs, src/features/copilot/stream-assets.ts, tests/unit/fufu-stream-assets.test.ts; modify package.json and .gitignore. Generate public/voice-stream/1.12.20/manifest.json, engine scripts, WASM, model shards and notices (ignored).

**Interfaces:** Export loadStreamAssets(signal: AbortSignal, onProgress: (percent: number) => void): Promise<{baseUrl: string; model: ArrayBuffer}>. Manifest specifies version, data byte length and each shard URL, byte length and SHA-256.

- [ ] Write tests asserting manifest validation rejects inconsistent sizes/hashes, successful shards reconstruct identical bytes, and cache-write rejection still returns verified bytes.
- [ ] Run `npx vitest run tests/unit/fufu-stream-assets.test.ts`; verify failure before implementation.
- [ ] Implement the loader with bounded parallel downloads, abort handling and optional versioned Cache API storage; verify cached bytes before use.
- [ ] Implement the preparation script: download the official pinned archive, verify hash before extraction, split data into 24 MiB shards, emit manifest and copy engine/WASM/notices. Reject unexpected archive paths. Confirm the included model's redistribution license from primary sources; stop release if unresolved.
- [ ] Add `prepare:voice` script and invoke it before production build. Ignore generated cache/assets; skip repeat generation only after verifying manifest and files.
- [ ] Run asset unit tests and the script twice; verify all hashes and maximum file size. Record source/license evidence in docs/superpowers/specs/2026-10-24-fufu-live-dictation-verification.md.
- [ ] Commit only source, tests and documentation as `feat: prepare verified streaming speech assets`.

## Task 2: Streaming recognition and microphone lifecycle

**Files:** Create src/features/copilot/stream-protocol.ts, stream-worker.ts, stream-runtime.ts, stream-pcm.ts, stream-transcript.ts, public/voice-pcm-worklet.js; create tests/unit/fufu-stream-pcm.test.ts, fufu-stream-transcript.test.ts and fufu-stream-runtime.test.ts.

**Interfaces:** `prepareStream(signal: AbortSignal, onProgress: (percent: number) => void): Promise<StreamEngine>`; `StreamEngine.start(onPartial: (text: string) => void): Promise<StreamRecording>`; `StreamRecording.stop(): Promise<string>`; `StreamRecording.cancel(): void`; `StreamEngine.dispose(): void`. The worker protocol uses request/session IDs for prepare/start/audio/finish/cancel/dispose and progress/ready/partial/final/error/ack responses. Runtime owns microphone and AudioContext; worker owns recognizer and utterance state.

- [ ] Write tests for 44.1/48 kHz to 16 kHz conversion across irregular chunk boundaries, endpoint accumulation with repeated identical partials, empty/silent final text, stale session rejection, denied permission cleanup, pending-stop cancellation and queue overload.
- [ ] Run the three new unit test files; verify failure before implementation.
- [ ] Implement continuous resampling with retained phase, worklet PCM transfer and acknowledgements. Bound outstanding PCM to five seconds; overload stops capture with a useful retry/fallback error, never silently drops samples.
- [ ] Implement worker initialization from Task 1's verified buffer using Emscripten preloaded-package support. Keep the recognizer warm until dispose. Decode incrementally; accumulate completed endpoints, replace the active partial, and flush final audio plus 0.5 seconds of zero padding on Stop.
- [ ] Implement runtime cancellation and cleanup for every track, worklet, context and listener. Reject late messages by session ID. A failed or cancelled preparation terminates the worker; successful preparation remains reusable.
- [ ] Run the new unit tests; require all pass. Test actual worker initialization and decoding against the pinned package in Chromium before relying on mocks.
- [ ] Commit as `feat: stream bilingual dictation on device`.

## Task 3: Composer integration and explicit fallback

**Files:** Modify src/features/copilot/voice-input.tsx and tests/component/fufu-voice-input.test.tsx; extend tests/component/fufu-conversation.test.tsx. Keep voice-runtime.ts and voice-worker.ts as the existing standard fallback.

**Interfaces:** Preserve VoiceInput's existing disabled/onText/onBusyChange props. Internal phases become idle/preparing/starting/recording/finalizing; onText receives only one final transcript. Show interim transcript with a visible provisional label and an accessible live status.

- [ ] Add component tests for explicit preparation, progress/cancel, changing provisional text, one final insertion, no automatic Send, cancel/restart with stale completion, permission failure and explicit standard-dictation fallback.
- [ ] Add composer assertions that pre-existing typed text remains, a transcript over 1,000 characters is retained and Send stays disabled, and reply speech stops before microphone capture.
- [ ] Run focused component tests and verify new behavior fails before implementation.
- [ ] Implement live-first recording, first-use ready instruction, existing two-minute timer and Stop/Cancel controls. Dispose on unmount/navigation. Offer `Use standard dictation` after a streaming failure; explain that standard text appears after Stop. Do not silently switch modes.
- [ ] Run focused component and existing voice runtime tests; require all pass. Check desktop and 390-pixel light/dark layouts without horizontal overflow.
- [ ] Commit as `feat: show live Fufu dictation in the composer`.

## Task 4: Real-browser acceptance and release

**Files:** Create tests/e2e/fufu-live-dictation.spec.ts and update docs/superpowers/specs/2026-10-24-fufu-live-dictation-verification.md.

- [ ] Feed genuine AudioContext-generated MediaStreams in real time through the actual worklet and WASM recognizer. Test English, Mandarin, mixed speech, silence, multiple utterances and a final sentence after 30 seconds. Record first-partial wall time and Stop-to-final; document accuracy limitations without a zero-delay claim.
- [ ] Assert no outbound audio requests, no automatic chat request, cancel/navigation cleanup, reusable warm preparation and clear failure with unavailable assets. Keep banking endpoints isolated in microphone-only tests.
- [ ] Run full `npm test`, `npm run typecheck`, targeted ESLint and production build; resolve regressions. Have one independent reviewer inspect the final changes and acceptance evidence.
- [ ] Publish only this feature's source/docs/test files with a leased GitHub main update. Check deployment build/static asset limits and licensing notices before promoting the resulting release.
- [ ] Verify the actual Vercel manifest/shards and homepage microphone behavior; confirm the production alias and report what was tested, including lack of physical-phone measurements.

## Self-review

All approved behavior maps to Tasks 1–4. Interfaces consistently preserve onText as a final-only callback; provisional text never becomes a banking instruction. Cache refusal, cancellation races, queue overflow, silence and typed-text preservation each have an explicit test owner. Licensing and deployment feasibility are release gates rather than assumptions. Existing Whisper remains available without an additional backend.
