import * as fs from "node:fs/promises"

import * as chokidar from "chokidar"

import {p, rel, terminateSignal} from "../_utils.js"

import {generateAll, makeGenerator, resolveLocations} from "./generator.js"
import {sources} from "./config.js"

let genPromise = generateAll()

async function updateFile(file) {
	try {
		if ((/^docs\/(?:nav-[^/]*|layout\.html)$/).test(rel(file))) {
			genPromise = makeGenerator()
			file = p("docs")
		}
		await (await genPromise)(file)
	} catch (e) {
		console.error(e.stack)
	}
}

async function removeFile(file) {
	try {
		await fs.rm(resolveLocations(file).target, {recursive: true, force: true})
	} catch (e) {
		console.error(e.stack)
	}
}

export async function generateWatch() {
	await genPromise

	console.log("Initial compilation finished.")

	const watcher = chokidar.watch(Object.values(sources), {
		ignoreInitial: true,
		awaitWriteFinish: true,
		atomic: true,
	})

	watcher.on("add", updateFile)
	watcher.on("change", updateFile)
	watcher.on("unlink", removeFile)
	watcher.on("unlinkDir", removeFile)

	terminateSignal().addEventListener("abort", () => watcher.close(), {once: true})
}
