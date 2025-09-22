import fs from "node:fs/promises";
import path from "node:path";
import { PromisePool } from "@supercharge/promise-pool";
import axios from "axios";
import cliProgress from "cli-progress";
import type { Cue, Manifest, Representation, Segment } from "cmdt-shared";
import { mkdirp } from "mkdirp";
import type winston from "winston";
import { getOpts } from "./cli-opts.js";
import { getInstance as getLogger } from "./logger.js";

export type DownloadEntry = {
	url: string;
	destDir: string;
	destFile: string;
	segment?: Segment;
	captions?: Array<Cue>;
	representation: Representation;
};

export class SegmentDownloader {
	private queue: Array<DownloadEntry> = [];
	private logger: winston.Logger;
	constructor(private manifest: Manifest) {
		this.logger = getLogger();
	}
	public async download(): Promise<Array<DownloadEntry>> {
		this.logger.info("Building download queue...");
		this.queue = this.buildManifestDownloadQueue();
		this.logger.info(`Download queue length: ${this.queue.length}`);
		if (!getOpts().skipDownload) {
			await this.doDownload(this.queue);
		} else {
			this.logger.warn("Skipping download");
		}
		return this.queue;
	}
	public getQueue(): Array<DownloadEntry> {
		return this.queue;
	}
	private async doDownload(queue: Array<DownloadEntry>): Promise<void> {
		this.logger.info("Downloading segments...");

		const showProgress = ["info", "debug"].includes(getOpts().logLevel);

		const downloadProgressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

		if (showProgress) {
			downloadProgressBar.start(queue.length, 0);
		}

		await PromisePool.withConcurrency(5)
			.for(queue)
			// biome-ignore lint/suspicious/noExplicitAny: error type
			.handleError(async (error: any, download: DownloadEntry) => {
				this.logger.error(`Error downloading segment: ${download.url}`, error);
			})
			.process(async (download: DownloadEntry) => {
				await mkdirp(download.destDir);
				const response = await axios.get(download.url, {
					responseType: "arraybuffer",
				});

				const exists = await fs
					.access(path.resolve(download.destDir, download.destFile), fs.constants.R_OK | fs.constants.W_OK)
					.then(() => true)
					.catch(() => false);

				if (exists) {
					this.logger.warn(`File already exists: ${download.destFile}. Skipping download.`);
					if (showProgress) {
						downloadProgressBar.increment();
					}
					return;
				}

				await fs.writeFile(path.resolve(download.destDir, download.destFile), response.data);

				if (showProgress) {
					downloadProgressBar.increment();
				}
			});

		downloadProgressBar.stop();
	}

	private resolveUrl(manifest: Manifest, url: string): string {
		if (!url.startsWith("http")) {
			if (url.startsWith("/")) {
				return `${manifest.url.origin}${url}`;
			}
			return `${manifest.url.origin}/${url}`;
		}
		return url;
	}

	private buildManifestDownloadQueue(): Array<DownloadEntry> {
		const manifest = this.manifest;
		const dlDirBase = getOpts().output;
		const downloads: Array<DownloadEntry> = [];
		const mediaTypes = [manifest.audio, manifest.images, manifest.video].map((r) => r.toArray());
		const initSegments = new Map<string, string>();
		for (const mediaType of mediaTypes) {
			for (const representation of mediaType) {
				let representationDir = `representation-${representation.id.replaceAll("/", "-")}`;
				if (representation.width && representation.height) {
					representationDir += `-${representation.width}x${representation.height}`;
				}
				const dlDir = `${representation.type}/${representationDir}`;
				for (const segment of representation.segments) {
					const destDir = path.resolve(dlDirBase, dlDir);
					if (segment.initSegmentUrl && !initSegments.has(segment.initSegmentUrl)) {
						const initSegmentFile = segment.initSegmentUrl.split("/").pop() ?? "";
						const destFile = `${segment.startTime}-init-${initSegmentFile}`;
						initSegments.set(segment.initSegmentUrl, path.resolve(destDir, destFile));
						downloads.push({
							url: this.resolveUrl(manifest, segment.initSegmentUrl),
							destDir,
							destFile,
							representation,
						});
					}
					const uriFile = segment.url.split("/").pop() ?? "";
					const destFile = `${segment.startTime}-${uriFile}`;
					downloads.push({
						url: this.resolveUrl(manifest, segment.url),
						destDir,
						destFile,
						representation,
						segment,
					});
					segment.fileSystemPath = path.resolve(destDir, destFile);
					if (segment.initSegmentUrl && initSegments.has(segment.initSegmentUrl)) {
						segment.initSegmentFilesystemPath = initSegments.get(segment.initSegmentUrl);
					}
				}
			}
		}
		return downloads;
	}
}
