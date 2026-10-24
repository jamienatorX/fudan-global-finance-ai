# Fufu live browser dictation

Date: 2026-10-24. Status: proposed production change following a completed throwaway benchmark.

## Intent

Users want words to appear while speaking and little processing after Stop. Keep the website free, support Chinese and English without a language selector, and avoid a separate always-on server. No claim of zero latency.

## Approaches

- VoiceStudio backend: supports partial/final WebSocket transcripts and warm models, but requires a continuously running Python service. The user chose the browser alternative.
- Browser streaming: the chosen direction. Use Sherpa-ONNX's bilingual streaming recognizer directly in a worker; do not embed VoiceStudio's desktop application.
- Existing Whisper: retained as an explicit standard-dictation fallback. It supports multilingual input but currently processes after Stop.

## Proposed behavior

1. Keep the existing microphone button, two-minute recording timer, Cancel, editable text and explicit Send.
2. On first use, prepare the streaming model with visible progress and cancellation. Ask the user to begin speaking once ready. Later sessions reuse cached files and a warm worker where available. Do not silently download the large model on every homepage visit.
3. Show changing words while the microphone is active. Label them provisional. Finalize into the editable message after Stop; never automatically send a message or authorize a banking change.
4. Stop reading replies aloud before capture. Stop and release microphone tracks on cancel, navigation and unmount; ignore late worker responses.
5. Keep full transcripts. Above the existing 1,000-character chat limit, ask the user to edit before Send rather than truncating.
6. If loading, device compatibility or decoding fails, preserve typed text and offer the existing Whisper dictation explicitly. No paid provider is selected.

## Implementation decisions proposed by the builder

Use the tested official Sherpa-ONNX WASM bilingual Zipformer package in a dedicated worker, with 16 kHz mono PCM passed incrementally from an AudioWorklet. Keep recognition off the UI thread. Bound the audio queue and stop with a useful message if a device cannot keep up. Endpointing collects completed utterances and replaces only the active partial, avoiding duplicate text. Cancelling discards the current spoken draft.

Model files are approximately 199 MB, plus 11.5 MB WASM and small JS files. Cache storage can be cleared or unavailable; preparation may recur. The official archive is 181,593,044 bytes (about 173 MiB). Download at build time from the pinned official release, verify SHA-256 E889207CD6A84973CBC028C05115CDD778AE8E277867B83169644BE5B3A63C53, and generate static shards under 32 MB plus a versioned manifest. Do not commit binaries or add a speech server. Verify Vercel's resulting static deployment before promotion. Preserve upstream notices and review the included model license alongside the Apache-2.0 engine license before redistribution.

## Evidence and limits

Throwaway probe: outputs/streaming-spike/benchmark.cjs and results.json in the chat workspace. It fed synthetic PCM in 0.2-second increments through the actual browser WASM recognizer, faster than real time. It did not benchmark live microphone scheduling or phone hardware.

English and Mandarin each first produced partial words at 0.8 seconds of audio. English processing took 1.96 seconds for 2.80 seconds of audio; Mandarin took 2.31 seconds for 4.88 seconds. Final padding/decoding cost 0.15-0.30 seconds on this laptop. These are not guaranteed user-visible latencies. Local uncached startup took 7.94 seconds, excluding internet download.

English and Mandarin examples were understood. The mixed-language sample omitted Spotify and used a currency homophone. Names and amounts require user review; do not silently guess missing merchants.

## Acceptance

Verify English, Mandarin, mixed language, silence, multiple utterances, cancellation, permission denial, unavailable cache, slow decoding and navigation cleanup. Measure first partial and Stop-to-final using real-time synthetic streams, including speech after 30 seconds. Verify no audio leaves the browser, no automatic Send/action, no duplicate draft text, typed-text preservation and 1,000-character handling. Test desktop browsers and mobile layout; report physical-phone limits honestly. Keep existing banking tests passing.

Not yet implemented or deployed: live streaming. Already deployed separately: Listen/Stop and two-minute Whisper dictation, commit f6734204973adc5dc746e6becb55bbd6cbff5db0.
