# FU Bank isolated analysis runner

This administrative runner executes supplied Python analysis in a fresh Vercel microVM. It is separate from the banking application and is not connected to Fufu chat. No public code-execution endpoint is installed.

## Run

Use Node 22 or newer. Inside analysis-runner run npm ci, then npm test. Authenticate the SDK through the trusted caller's Vercel OIDC environment as described by https://vercel.com/docs/sandbox/sdk-reference. Never put that token into generated code or VM environment variables.

Create a Python file that prints one JSON value, for example:

    import json
    print(json.dumps({"totalMinor": sum([1000, 2500])}))

Run: node run-isolated-analysis.mjs example.py unique-audit.json

The audit file must not exist. It records the run ID, code SHA-256, timestamps, status, limits and cleanup outcome; raw generated code, credentials and stdout/stderr are not copied to audit. Keep audits in a trusted, access-controlled location. Results are untrusted analysis, never payment receipts or approvals.

## Isolation

Fresh nonpersistent microVM; deny-all network policy; no exposed ports; no inherited credential environment. Generated code runs as a separate analysis OS user. The trusted supervisor clears the child environment, uses isolated Python startup, caps CPU at two seconds, wall time at four seconds, address space at 128 MiB, regular output/file size at 16 KiB, open files at 32 and processes at 16. The outer VM expires after 30 seconds, even if malicious descendants detach or evade process-group cleanup. VM stop runs in finally. No banking database, user session, service key or financial mutation tool is supplied.

The microVM is the security boundary. Python flags and resource limits alone are not a sandbox. Never run the Python supervisor directly on an application host with sensitive files. The runner does not validate the financial truth of arbitrary generated output. It does not provide a public service, rate limits, a model code generator, or hosted audit storage. Those require additional integration before enabling code execution from Fufu.

## Verification

Seven live checks passed in a separate Vercel microVM with networkPolicy mode deny-all: calculation, CPU exhaustion, memory exhaustion, output overflow, invalid JSON, empty credential environment, and rejected outbound TCP connection to 1.1.1.1:443. These verified the supervisor under a dedicated non-root user. Two local mocked SDK tests verify creation policy, audit and finally cleanup on success/failure. The full SDK CLI was not exercised with production OIDC; no production app endpoint was enabled. The temporary VM was stopped without a snapshot.

The connector first rejected a string network policy, and automatic review rejected an ambiguous empty allow-list. Inspection of the installed official SDK showed the explicit API representation {mode:"deny-all"}; that exact policy was accepted and used. No network restriction was relaxed.

