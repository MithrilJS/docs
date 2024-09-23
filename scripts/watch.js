import "./_improve-rejection-crashing.js"

import {exec} from "./_exec.js"
import {generateWatch} from "./_build/watch.js"
import {lintWatch} from "./_lint-docs/do-lint.js"

exec("npx", ["http-server", "-c-1", "-p", "8080", "dist"])
generateWatch()
lintWatch()
