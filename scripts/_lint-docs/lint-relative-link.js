import * as fs from "node:fs"
import * as path from "node:path"

/** @param {(message?: string) => void} callback */
export function checkLocal(base, href, callback) {
	const exec = (/^([^#?]*\.md)(?:$|\?|#)/).exec(href)
	if (exec !== null) {
		fs.access(path.join(base, exec[1]), (err) => {
			if (err) {
				callback(`Broken internal link: ${href}`)
			} else {
				callback()
			}
		})
	}
}
