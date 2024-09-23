import {once} from "node:events"

import {spawn} from "cross-spawn"

import {p, terminateSignal} from "./_utils.js"

export async function exec(command, args, opts) {
	const ctrl = new AbortController()
	terminateSignal().addEventListener("abort", () => ctrl.abort(), {
		once: true,
		signal: ctrl.signal,
	})

	const proc = spawn(command, args, {
		stdio: "inherit",
		cwd: p("."),
		signal: ctrl.signal,
		...opts,
	})

	const delayedKill = () => {
		setTimeout(() => {
			if (!proc.exitCode && !proc.signalCode) proc.kill("SIGKILL")
		}, 5000).unref()
	}

	ctrl.signal.addEventListener("abort", delayedKill, {once: true})

	try {
		const exitP = once(proc, "exit", {signal: ctrl.signal})
		const result = await opts?.extract?.(proc)
		await exitP
		ctrl.signal.removeEventListener("abort", delayedKill)
		if (proc.exitCode || proc.signalCode) {
			process.exitCode = 1
			console.error(`\`${[command, ...args].join(" ")}\` exited with code ${proc.exitCode}, signal ${proc.signalCode}`)
		}
		return result
	} finally {
		ctrl.abort()
	}
}
