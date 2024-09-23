import * as crypto from "node:crypto"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import {fileURLToPath} from "node:url"
import {pipeline} from "node:stream/promises"
import {setMaxListeners} from "node:events"

export const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
export const p = (...args) => path.resolve(root, ...args)
export const rel = (file) => path.relative(root, file).replaceAll("\\", "/")
export const noop = () => {}

export function warnError(e) {
	// Don't care about any of these.
	if ((/^(?:ECONNRESET|ECONNABORT|EPIPE)$/).test(e.code)) {
		return
	}

	process.exitCode = 1
	console.warn(e.stack)
}

/** @param {(tempPath: string) => void | Promise<void>} init */
async function withTemp(target, init) {
	let tempPath

	try {
		for (;;) {
			tempPath = `${target}~${crypto.randomUUID()}.tmp`

			try {
				await init(tempPath)
				break
			} catch (e) {
				if (e.code === "EEXIST") continue
				throw e
			}
		}

		try {
			await fs.rename(tempPath, target)
		} catch (e) {
			if (e.code !== "ENOENT") throw e
			terminateSignal().throwIfAborted()
			await fs.mkdir(path.dirname(target), {recursive: true})
			terminateSignal().throwIfAborted()
			await fs.rename(tempPath, target)
		}
	} catch (e) {
		try {
			await fs.unlink(tempPath)
		} catch {
			// ignore
		}
		throw e
	}
}

export function write(target, data) {
	return withTemp(target, (tempPath) => fs.writeFile(tempPath, data, {flag: "wx"}))
}

export async function copy(source, target, label) {
	try {
		await withTemp(target, async(tempPath) => {
			const sourceHandle = await fs.open(source, "r")
			terminateSignal().throwIfAborted()
			const targetHandle = await fs.open(tempPath, "wx").catch((e) => (
				sourceHandle.close().finally(() => {
					throw e
				})
			))
			terminateSignal().throwIfAborted()

			return pipeline(sourceHandle.createReadStream(), targetHandle.createWriteStream())
		})

		if (label) console.log(label)
	} catch (e) {
		if (e.code !== "EISDIR") throw e
		let children
		try {
			children = await fs.readdir(source)
		} catch (inner) {
			if (inner.code === "ENOENT") return
			throw inner
		}
		terminateSignal().throwIfAborted()
		await fs.mkdir(target, {recursive: true})
		terminateSignal().throwIfAborted()
		await Promise.all(children.map((name) => (
			copy(path.join(source, name), path.join(target, name), label && `${label}/${name}`)
		)))
	}
}

/** @type {undefined | AbortSignal} */
let terminateSignalResult

export function terminateSignal() {
	if (terminateSignalResult) return terminateSignalResult

	const ctrl = new AbortController()

	function doAbort() {
		process.off("SIGINT", doAbort)
		process.off("SIGTERM", doAbort)
		ctrl.abort()
	}

	process.on("SIGINT", doAbort)
	process.on("SIGTERM", doAbort)

	return (terminateSignalResult = ctrl.signal)
}
