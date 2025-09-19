import path from "node:path";
import winston from "winston";
import { getOpts } from "./cli-opts.js";

let logger: winston.Logger | null = null;

export function getInstance(): winston.Logger {
	if (!logger) {
		const opts = getOpts();
		const level = opts.logLevel;

		logger = winston.createLogger({
			level,
			format: winston.format.cli(),
			transports: [
				new winston.transports.Console({ level }),
				new winston.transports.File({
					filename: path.resolve(opts.output, "debug.log"),
					level: "debug",
					format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
				}),
			],
		});

		if (level === "off") {
			for (const t of logger.transports) {
				t.silent = true;
			}
		}
	}
	return logger;
}
