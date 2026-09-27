"""Inline site/dist into one self-contained HTML file.

  python3 omori-sim/tools/build_single.py            -> omori-battle-lab.html (opens from file://)
  python3 omori-sim/tools/build_single.py --artifact OUT.html   (no html/head/body wrapper)
"""
import re, sys, pathlib
dist = pathlib.Path(__file__).resolve().parent.parent / 'site' / 'dist'
root = dist.parent.parent.parent
html = (dist / 'index.html').read_text()
css = (dist / 'styles.css').read_text()
engine = (dist / 'engine.js').read_text()
app = (dist / 'app.js').read_text()

app = re.sub(r"^import \{[^}]*\} from './engine.js';\n", '', app)
# The worker cannot load ./engine.js from a single file, so it gets the engine source through a blob URL.
worker_src = re.sub(r'^export ', '', engine, flags=re.M) + "\nself.onmessage=e=>{const{setup,trials,seed}=e.data;self.postMessage(runAll(setup,trials,seed))};\n"
app = app.replace(
    "function makeWorker(){return new Worker(new URL('./worker.js',import.meta.url),{type:'module'})}",
    "const WORKER_SRC=" + repr(worker_src).replace('</', '<\\/') + ";\nfunction makeWorker(){return new Worker(URL.createObjectURL(new Blob([WORKER_SRC],{type:'text/javascript'})))}")
engine_inline = re.sub(r'^export ', '', engine, flags=re.M)

html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + css + '\n</style>')
html = html.replace('<script type="module" src="app.js"></script>',
                    '<script type="module">\n' + (engine_inline + '\n' + app).replace('</script', '<\\/script') + '\n</script>')

if '--artifact' in sys.argv:
    out = pathlib.Path(sys.argv[sys.argv.index('--artifact') + 1])
    html = re.sub(r'<!doctype html>\s*<html[^>]*>\s*<head>\s*', '', html, flags=re.I)
    html = re.sub(r'<meta charset[^>]*>\s*<meta name="viewport"[^>]*>\s*', '', html)
    for tag in ('</head>', '<body>', '</body>', '</html>'):
        html = html.replace(tag, '')
else:
    out = root / 'omori-battle-lab.html'
out.write_text(html.strip() + '\n')
print(out)
