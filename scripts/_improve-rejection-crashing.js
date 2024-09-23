process.on("unhandledRejection", (e) => {
	process.exitCode = 1

	// Suppress these on the ground.
	if (e.code !== "ABORT_ERR") {
		console.error(e)

		if (e.stdout?.length) {
			console.error(e.stdout.toString("utf-8"))
		}

		if (e.stderr?.length) {
			console.error(e.stderr.toString("utf-8"))
		}
	}

	// eslint-disable-next-line n/no-process-exit
	process.exit()
})
