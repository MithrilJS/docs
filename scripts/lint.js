import "./_improve-rejection-crashing.js"

import {exec} from "./_exec.js"
import {lintAll} from "./_lint-docs/do-lint.js"

await exec("npx", ["eslint", ".", "--cache"])
await exec("node", ["scripts/lint-docs.js"])
lintAll()
