<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project rules

- Never type an emission factor into code or data by hand. `data/*.json` is written by `scripts/build_factors.py` from the published sources: change the script and run `npm run factors`, never edit the JSON.
- Every number a user sees needs a source they can open.
- Nothing matched or extracted counts towards a total until a person accepts it, or opts in to auto-accept for high-confidence lines.
- Missing data is an error on the line. Never fill a gap with an assumed value.
- `lib/engine` is pure TypeScript with tests. Run `npm test` before committing.
- Demo data is synthetic and says so in the file.
