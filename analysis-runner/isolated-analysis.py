"""Trusted supervisor. Run only in a fresh credential-free VM, never on the app host."""
import hashlib, json, os, resource, subprocess, sys, tempfile, time

def run(code):
    if not isinstance(code, str) or len(code.encode()) > 8192:
        raise ValueError('INVALID_CODE_SIZE')
    started = time.monotonic()
    with tempfile.TemporaryDirectory() as directory:
        script = os.path.join(directory, 'analysis.py')
        with open(script, 'w') as target:
            target.write(code)
        def limits():
            resource.setrlimit(resource.RLIMIT_CPU, (2, 2))
            resource.setrlimit(resource.RLIMIT_AS, (128 * 1024 * 1024,) * 2)
            resource.setrlimit(resource.RLIMIT_FSIZE, (16384, 16384))
            resource.setrlimit(resource.RLIMIT_NOFILE, (32, 32))
            resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
            resource.setrlimit(resource.RLIMIT_NPROC, (16, 16))
        # Output goes to bounded regular files, never an unbounded captured pipe.
        with tempfile.TemporaryFile() as out, tempfile.TemporaryFile() as err:
            process = subprocess.Popen([sys.executable, '-I', '-S', script], cwd=directory,
                env={'PATH': '/usr/bin:/bin', 'LANG': 'C.UTF-8'}, stdin=subprocess.DEVNULL,
                stdout=out, stderr=err, preexec_fn=limits, start_new_session=True)
            timed_out = False
            try:
                process.wait(timeout=4)
            except subprocess.TimeoutExpired:
                timed_out = True
            finally:
                # Kill descendants even if the initial interpreter already exited.
                import signal
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                process.wait()
            out.seek(0)
            raw = out.read(16385)
            result = None
            status = 'failed'
            if not timed_out and process.returncode == 0 and len(raw) <= 16384:
                try:
                    result = json.loads(raw)
                    status = 'completed'
                except (ValueError, UnicodeDecodeError):
                    status = 'invalid_output'
            return {'status': status, 'result': result, 'exitCode': process.returncode,
                'timedOut': timed_out, 'durationMs': round((time.monotonic()-started)*1000),
                'codeSha256': hashlib.sha256(code.encode()).hexdigest()}

if __name__ == '__main__':
    print(json.dumps(run(open(sys.argv[1]).read()), allow_nan=False))

