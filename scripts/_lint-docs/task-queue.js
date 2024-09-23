// CI needs a much lower limit so it doesn't hang.
const maxConcurrency = process.env.CI === "true" ? 5 : 20

const queue = []
let running = 0

function runTask(task) {
	process.nextTick(task, () => {
		if (running === maxConcurrency) {
			const nextTask = queue.shift()
			if (typeof nextTask === "function") runTask(nextTask)
		}
	})
}

/**
 * @param {(callback: () => void) => void} task
 */
export function submitTask(task) {
	if (typeof task !== "function") {
		throw new TypeError("`task` must be a function")
	}

	if (running < maxConcurrency) {
		running++
		runTask(task)
	} else {
		queue.push(task)
	}
}
