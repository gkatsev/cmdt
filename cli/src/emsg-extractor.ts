import fs from "node:fs/promises";
import path from "node:path";
import cliProgress from "cli-progress";
import { MediaType } from "cmdt-shared";
import type winston from "winston";
import { getOpts } from "./cli-opts.js";
import type { DownloadEntry } from "./downloader.js";
import { getInstance as getLogger } from "./logger.js";
import type { Report } from "./report.js";
import type IEmsg from "./utils/mp4/interfaces/IEmsg.js";
import type IParsedBox from "./utils/mp4/interfaces/IParsedBox.js";
import Mp4Parser from "./utils/mp4/parser.js";

export class EmsgExtractor {
	private logger: winston.Logger;
	constructor() {
		this.logger = getLogger();
	}
	public async extractEmsgFromDownloadedSegments(downloads: Array<DownloadEntry>, report: Report): Promise<void> {
		const mp4Parser = new Mp4Parser();
		this.logger.info("Extracting emsgs...");
		const showProgress = ["info", "debug"].includes(getOpts().logLevel);
		const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
		if (showProgress) {
			progress.start(downloads.length, 0);
		}
		for (const download of downloads) {
			const segmentMetadata = download.segment;
			if (download.representation.type !== MediaType.Video || !segmentMetadata) {
				if (showProgress) {
					progress.increment();
				}
				continue;
			}
			const segmentPath = path.resolve(download.destDir, download.destFile);
			try {
				await fs.access(segmentPath, fs.constants.R_OK | fs.constants.W_OK);
				// biome-ignore lint/correctness/noUnusedVariables: do not care about the error here
			} catch (e) {
				// files don't exist
				continue;
			}

			const segment = await fs.readFile(segmentPath);

			mp4Parser
				.fullBox("emsg", (box: IParsedBox) => {
					const parsedEmsgBox: IEmsg = Mp4Parser.parseEmsg(box);
					try {
						const strData = new TextDecoder("utf-8").decode(parsedEmsgBox.messageData as Uint8Array);
						parsedEmsgBox.messageData = strData;
					} catch (e) {
						this.logger.error(`Failed to decode emsg message data: ${e}`);
					}
					report.addEsmg(download.representation, segmentMetadata, parsedEmsgBox);
				})
				.box("moov", (box: IParsedBox) => {
					Mp4Parser.children(box);
				})
				.parse(new Uint8Array(segment).buffer);

			if (showProgress) {
				progress.increment();
			}
		}
		progress.stop();
	}
}
