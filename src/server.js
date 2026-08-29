"use strict"

const fs = require("fs")
const path = require("path")

function env(name, fallback) {
	const value = process.env[name]

	if (value === undefined || value === "") {
		return fallback
	}

	return value
}

function envBool(name, fallback = false) {
	const value = process.env[name]

	if (value === undefined || value === "") {
		return fallback
	}

	return ["1", "true", "yes", "on"].includes(String(value).toLowerCase())
}

function requireEnv(name) {
	const value = process.env[name]

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`)
	}

	return value
}

function loadWebDAV() {
	const mod = require("@filen/webdav")

	return {
		WebDAVServer: mod.WebDAVServer || mod.default,
		WebDAVServerCluster: mod.WebDAVServerCluster
	}
}

function loadFilenSDK() {
	const mod = require("@filen/sdk")

	return mod.FilenSDK || mod.default
}

async function main() {
	const mode = String(env("WEBDAV_MODE", "standalone")).toLowerCase()
	const hostname = env("WEBDAV_HOST", env("HOST", "0.0.0.0"))
	const port = Number(env("WEBDAV_PORT", env("PORT", "1900")))
	const httpsEnabled = envBool("WEBDAV_HTTPS", false)
	const authMode = String(env("WEBDAV_AUTH_MODE", "basic")).toLowerCase()
	const disableLogging = envBool("WEBDAV_DISABLE_LOGGING", false)
	const threadsRaw = env("WEBDAV_THREADS", "")
	const dataDir = env("HOME", "/data")
	const tmpPath = env("FILEN_TMP_PATH", path.join(dataDir, "tmp", "filen-sdk"))

	fs.mkdirSync(path.join(dataDir, ".config"), { recursive: true })
	fs.mkdirSync(tmpPath, { recursive: true })

	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error(`Invalid WEBDAV_PORT/PORT: ${port}`)
	}

	if (!["standalone", "proxy"].includes(mode)) {
		throw new Error(`WEBDAV_MODE must be standalone or proxy, got: ${mode}`)
	}

	if (!["basic", "digest"].includes(authMode)) {
		throw new Error(`WEBDAV_AUTH_MODE must be basic or digest, got: ${authMode}`)
	}

	if (mode === "proxy" && authMode === "digest") {
		throw new Error("Digest authentication is not supported in proxy mode.")
	}

	const { WebDAVServer, WebDAVServerCluster } = loadWebDAV()

	if (!WebDAVServer) {
		throw new Error("Official @filen/webdav package did not export WebDAVServer")
	}

	const common = {
		hostname,
		port,
		https: httpsEnabled,
		authMode,
		disableLogging
	}

	const threads = threadsRaw ? Number(threadsRaw) : undefined

	if (threadsRaw && (!Number.isInteger(threads) || threads < 1)) {
		throw new Error(`Invalid WEBDAV_THREADS: ${threadsRaw}`)
	}

	const useCluster = Boolean(threads) && WebDAVServerCluster
	let server

	if (mode === "proxy") {
		server = useCluster
			? new WebDAVServerCluster({
					...common,
					threads
			  })
			: new WebDAVServer(common)
	} else {
		const email = requireEnv("FILEN_EMAIL")
		const password = requireEnv("FILEN_PASSWORD")
		const username = requireEnv("WEBDAV_USERNAME")
		const webdavPassword = requireEnv("WEBDAV_PASSWORD")
		const twoFactorCode = env("FILEN_2FA", env("FILEN_TWO_FACTOR_CODE", ""))
		const FilenSDK = loadFilenSDK()

		if (!FilenSDK) {
			throw new Error("Official @filen/sdk package did not export FilenSDK")
		}

		const filen = new FilenSDK({
			metadataCache: true,
			connectToSocket: true,
			tmpPath
		})

		await filen.login({
			email,
			password,
			twoFactorCode: twoFactorCode || undefined
		})

		const user = {
			username,
			password: webdavPassword,
			sdk: filen
		}

		server = useCluster
			? new WebDAVServerCluster({
					...common,
					user,
					threads
			  })
			: new WebDAVServer({
					...common,
					user
			  })
	}

	await server.start()

	const proto = httpsEnabled ? "https" : "http"

	console.log(`Filen WebDAV v2 started (${mode}) on ${proto}://${hostname}:${port}`)
	console.log("Using official package @filen/webdav@0.3.1")

	const shutdown = async signal => {
		console.log(`Received ${signal}, stopping WebDAV...`)

		try {
			if (typeof server.stop === "function") {
				await server.stop(true)
			}
		} catch (error) {
			console.error("Error while stopping WebDAV:", error)
		}

		process.exit(0)
	}

	process.on("SIGTERM", () => {
		void shutdown("SIGTERM")
	})
	process.on("SIGINT", () => {
		void shutdown("SIGINT")
	})
}

main().catch(error => {
	const message = error && error.message ? error.message : error

	console.error("Failed to start Filen WebDAV:", message)
	process.exit(1)
})
