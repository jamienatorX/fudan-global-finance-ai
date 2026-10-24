# Fufu live dictation verification

2026-10-24. Implementation under review; production release pending.

## Real browser evidence

Actual Chromium WASM engine + AudioWorklet, real-time synthetic MediaStreams, 390×844 viewport. Chat-load response isolated; no banking/model request executed. Raw results: chat workspace outputs/fufu-live-browser-results.json; repeat harness outputs/fufu-live-browser-check.cjs. Fixture WAVs are synthetic, not user recordings.

| Input | First visible partial | Stop to final | Result |
| --- | --- | --- | --- |
| English | 1.50 s | 251 ms | Balance/budget question recognized |
| Mandarin | 1.37 s | 235 ms | Budget/balance question recognized |
| Mixed | 0.86 s | 235 ms | Merchant Spotify omitted; currency homophone |
| Long recording | 1.35 s | 222 ms | Sentence after 30 s retained; Singapore became SING A POOR |

Warm microphone startup 115–328 ms; cached-files/new-worker preparation ~4.8 s. First uncached local preparation ~7 s; these exclude Internet download. This is one laptop, not a latency guarantee. All four captured tracks stopped and no horizontal overflow occurred. Names/amounts still require review. No physical-phone/audio-quality claim.

The first acceptance attempt ran alongside the full suite and failed to produce text; the unloaded real-time rerun succeeded. Queue overload is explicitly reported instead of dropping PCM. Do not promise zero latency or universal device performance.

## Packaging and licenses

Official 1.12.20 archive SHA-256 verified: e889207cd6a84973cbc028c05115cdd778ae8e277867b83169644be5b3a63c53. Model data 199,059,238 bytes in 8 shards (24 MiB maximum); WASM 11,545,586 bytes. No binaries committed. Build script verifies the archive and generated file hashes, including notices, on repeat runs.

- Engine Apache-2.0: https://github.com/k2-fsa/sherpa-onnx/blob/v1.12.20/LICENSE
- Model Apache-2.0: https://huggingface.co/csukuangfj/sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20/blob/main/README.md
- Exact model packaging: https://github.com/k2-fsa/sherpa-onnx/blob/v1.12.20/.github/workflows/wasm-simd-hf-space-zh-en-asr-zipformer.yaml
- ONNX Runtime WASM 1.17.1 dependency: https://github.com/k2-fsa/sherpa-onnx/blob/v1.12.20/cmake/onnxruntime-wasm-simd.cmake
- Runtime license and third-party notices included with generated assets; models reconstructed unchanged.

## Automated checks

494 tests passed before the final routing/race/overload additions. Final full-suite count, lint, typecheck, build, independent review and deployed static-file verification will be appended when complete.

Repeat browser acceptance: prepare assets, start the app, set FUFU_SPEECH_FIXTURE_DIR to the chat outputs folder containing fufu-voice-{en,zh,mixed,long}.wav, run tests/e2e/fufu-live-dictation.spec.ts with Chromium. The fixtures used in this run and raw JSON remain in the chat workspace; normal CI skips this large optional test.

## Final local verification and preview

- 502/502 tests passed across 95 files after the independent review fix and integration of published main 2c92e2c (Next16.4.1, compact controls, support UI).
- Actual Playwright browser test passed all six cases (English, Mandarin, mixed, long tail, silence and repeated sentence across endpoint reset), 1.7 minutes. No message/action requests occurred; only the mocked initial conversation load was permitted.
- Separate silence run retained only the typed draft; repeated sentence appeared exactly twice. Finalization 118–229 ms; all tracks stopped; latest three-column composer at390px had no horizontal overflow.
- TypeScript and targeted ESLint passed. npm run build -- --webpack passed with Next16.4.1; initial16.4.0 build nudge resolved by preserving the newer published security patch.
- Fresh-context independent gpt-6-astra review: no Critical findings. BFCache stale-control finding regraded Important and fixed with a RED→GREEN regression. Acceptance evidence gaps closed by actual silence/repetition tests. Physical phones, Safari/Firefox, real-room microphone acoustics and broad accuracy remain unverified; no promise of zero latency.
- Vercel preview dpl_HhaZLtENbUM8nTxxppd4uPf2Xr47 READY for c9edf005495a72399c4527b1caf3a774e83bb010. Authenticated preview manifest returns200 and matches199,059,238 model bytes in8 shards. Production CSP includes worker-src self and wasm-unsafe-eval (not arbitrary JS eval); microphone permission is same-origin. Preview browser is Vercel-auth protected, so the public-origin microphone smoke remains a post-release check.

## Decisions made during execution

- Used Windows-native ledger bookkeeping instead of bash-only helpers; limited GitHub commits to feature paths. Risk: omitted files, mitigated by exact tree/blob hash checks.
- Public static voice-file routing and same-origin microphone/WASM permission were necessary: browser acceptance reproduced login redirects for model files. Private banking route tests remain protected.
- Preserved newer published security/layout/support changes before releasing. Risk: concurrent regression; tested latest dependencies and use a leased main update.
- CSP tests now match forbidden unsafe-eval/unsafe-inline as exact tokens; the old substring regex incorrectly rejected wasm-unsafe-eval. Arbitrary JavaScript evaluation remains forbidden in production.
