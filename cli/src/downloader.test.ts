import fs from "node:fs/promises";
import path from "node:path";
import axios from "axios";
import type { Manifest, MediaType, Representation, Segment } from "cmdt-shared";
import { UniqueRepresentationMap } from "cmdt-shared";
import { mkdirp } from "mkdirp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as cliOpts from "./cli-opts.js";
import { SegmentDownloader } from "./downloader.js";

// Mock dependencies
vi.mock("node:fs/promises");
vi.mock("mkdirp");
vi.mock("cli-progress");
vi.mock("./cli-opts.js");

// Note: Logger and axios are already globally mocked in test/setup.ts

const mockedCliOpts = vi.mocked(cliOpts);

describe("SegmentDownloader", () => {
	let downloader: SegmentDownloader;
	let mockManifest: Manifest;
	let mockRepresentation: Representation;
	let mockSegments: Segment[];

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Create mock segments
		mockSegments = [
			{
				startTime: 0,
				duration: 4000,
				url: "segment1.mp4",
				initSegmentUrl: "init.mp4",
			},
			{
				startTime: 4000,
				duration: 4000,
				url: "segment2.mp4",
				initSegmentUrl: "init.mp4",
			},
		];

		// Create mock representation
		mockRepresentation = {
			id: "video-1080p",
			segments: mockSegments,
			type: "video" as MediaType,
			width: 1920,
			height: 1080,
			bandwidth: 5000000,
			hasCaptions: { cea608: false, cea708: false },
			codecs: "avc1.640028",
		};

		// Create mock manifest
		const videoMap = new UniqueRepresentationMap();
		videoMap.add(mockRepresentation);

		mockManifest = {
			url: new URL("https://example.com/manifest.mpd"),
			video: videoMap,
			audio: new UniqueRepresentationMap(),
			images: new UniqueRepresentationMap(),
			captionStreamToLanguage: {},
			periods: [],
		};

		// Mock CLI options - override the global mock for this test
		mockedCliOpts.getOpts.mockReturnValue({
			manifest: "https://example.com/manifest.mpd",
			output: "/tmp/download",
			skipDownload: undefined, // Boolean flags are undefined when not set
			logLevel: "info" as const,
		});

		downloader = new SegmentDownloader(mockManifest);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("constructor", () => {
		it("should initialize with manifest", () => {
			expect(downloader).toBeInstanceOf(SegmentDownloader);
		});
	});

	describe("buildManifestDownloadQueue", () => {
		it("should build download queue with correct entries", async () => {
			const queue = await downloader.download();

			expect(queue).toHaveLength(3); // 1 init segment + 2 media segments

			// Check init segment entry
			const initEntry = queue.find((entry) => entry.destFile.includes("init"));
			expect(initEntry).toBeDefined();
			expect(initEntry?.url).toBe("https://example.com/init.mp4");
			expect(initEntry?.destDir).toBe(path.resolve("/tmp/download", "video/representation-video-1080p-1920x1080"));
			expect(initEntry?.destFile).toBe("0-init-init.mp4");
			expect(initEntry?.representation).toBe(mockRepresentation);

			// Check media segment entries
			const mediaEntries = queue.filter((entry) => !entry.destFile.includes("init"));
			expect(mediaEntries).toHaveLength(2);

			expect(mediaEntries[0]?.url).toBe("https://example.com/segment1.mp4");
			expect(mediaEntries[0]?.destFile).toBe("0-segment1.mp4");
			expect(mediaEntries[0]?.segment).toBe(mockSegments[0]);

			expect(mediaEntries[1]?.url).toBe("https://example.com/segment2.mp4");
			expect(mediaEntries[1]?.destFile).toBe("4000-segment2.mp4");
			expect(mediaEntries[1]?.segment).toBe(mockSegments[1]);
		});

		it("should handle representations without dimensions", async () => {
			const audioRep: Representation = {
				id: "audio-128k",
				segments: [{ startTime: 0, duration: 4000, url: "audio.mp4" }],
				type: "audio" as MediaType,
				bandwidth: 128000,
				hasCaptions: { cea608: false, cea708: false },
				language: "en",
			};

			const audioMap = new UniqueRepresentationMap();
			audioMap.add(audioRep);
			mockManifest.audio = audioMap;

			const queue = await downloader.download();
			const audioEntry = queue.find((entry) => entry.destDir.includes("audio"));

			expect(audioEntry?.destDir).toBe(path.resolve("/tmp/download", "audio/representation-audio-128k"));
		});

		it("should handle relative URLs correctly", async () => {
			if (mockSegments[0]) mockSegments[0].url = "/relative/segment1.mp4";
			if (mockSegments[1]) mockSegments[1].url = "relative/segment2.mp4";

			const queue = await downloader.download();
			const mediaEntries = queue.filter((entry) => !entry.destFile.includes("init"));

			expect(mediaEntries[0]?.url).toBe("https://example.com/relative/segment1.mp4");
			expect(mediaEntries[1]?.url).toBe("https://example.com/relative/segment2.mp4");
		});

		it("should handle absolute URLs correctly", async () => {
			if (mockSegments[0]) mockSegments[0].url = "https://cdn.example.com/segment1.mp4";

			const queue = await downloader.download();
			const mediaEntry = queue.find((entry) => entry.destFile.includes("segment1"));

			expect(mediaEntry?.url).toBe("https://cdn.example.com/segment1.mp4");
		});

		it("should set filesystem paths on segments", async () => {
			await downloader.download();

			expect(mockSegments[0]?.fileSystemPath).toBe(
				path.resolve("/tmp/download", "video/representation-video-1080p-1920x1080", "0-segment1.mp4"),
			);
			expect(mockSegments[0]?.initSegmentFilesystemPath).toBe(
				path.resolve("/tmp/download", "video/representation-video-1080p-1920x1080", "0-init-init.mp4"),
			);
		});
	});

	describe("download", () => {
		it("should skip download when skipDownload option is true", async () => {
			mockedCliOpts.getOpts.mockReturnValue({
				manifest: "https://example.com/manifest.mpd",
				output: "/tmp/download",
				skipDownload: true, // Boolean flags are true when set
				logLevel: "info" as const,
			});

			const axiosGetSpy = vi.spyOn(axios, "get");
			const mkdirpSpy = vi.fn().mockResolvedValue(undefined);
			vi.mocked(mkdirp).mockImplementation(mkdirpSpy);
			const fsWriteSpy = vi.spyOn(fs, "writeFile");

			const queue = await downloader.download();

			expect(queue).toHaveLength(3);
			expect(axiosGetSpy).not.toHaveBeenCalled();
			expect(mkdirpSpy).not.toHaveBeenCalled();
			expect(fsWriteSpy).not.toHaveBeenCalled();
		});

		it("should download segments when skipDownload is false", async () => {
			// Mock axios response
			const axiosGetSpy = vi.spyOn(axios, "get").mockResolvedValue({
				data: Buffer.from("fake segment data"),
			});

			// Mock file system operations
			vi.spyOn(fs, "access").mockRejectedValue(new Error("File does not exist"));
			const fsWriteSpy = vi.spyOn(fs, "writeFile").mockResolvedValue();
			const mkdirpSpy = vi.fn().mockResolvedValue(undefined);
			vi.mocked(mkdirp).mockImplementation(mkdirpSpy);

			await downloader.download();

			expect(mkdirpSpy).toHaveBeenCalledTimes(3); // Once per download entry
			expect(axiosGetSpy).toHaveBeenCalledTimes(3);
			expect(fsWriteSpy).toHaveBeenCalledTimes(3);

			// Verify axios calls
			expect(axiosGetSpy).toHaveBeenCalledWith("https://example.com/init.mp4", {
				responseType: "arraybuffer",
			});
			expect(axiosGetSpy).toHaveBeenCalledWith("https://example.com/segment1.mp4", {
				responseType: "arraybuffer",
			});
		});

		it("should skip writing file if file already exists", async () => {
			// Mock file exists
			vi.spyOn(fs, "access").mockResolvedValue();
			const fsWriteSpy = vi.spyOn(fs, "writeFile").mockResolvedValue();
			const mkdirpSpy = vi.fn().mockResolvedValue(undefined);
			vi.mocked(mkdirp).mockImplementation(mkdirpSpy);
			const axiosGetSpy = vi.spyOn(axios, "get").mockResolvedValue({
				data: Buffer.from("fake segment data"),
			});

			await downloader.download();

			expect(mkdirpSpy).toHaveBeenCalledTimes(3);
			expect(axiosGetSpy).toHaveBeenCalledTimes(3); // Still downloads but skips writing
			expect(fsWriteSpy).not.toHaveBeenCalled(); // File writing is skipped
		});
	});

	describe("getQueue", () => {
		it("should return the current download queue", async () => {
			await downloader.download();
			const queue = downloader.getQueue();

			expect(queue).toHaveLength(3);
			expect(queue[0]).toHaveProperty("url");
			expect(queue[0]).toHaveProperty("destDir");
			expect(queue[0]).toHaveProperty("destFile");
			expect(queue[0]).toHaveProperty("representation");
		});

		it("should return empty queue before download is called", () => {
			const queue = downloader.getQueue();
			expect(queue).toHaveLength(0);
		});
	});

	describe("resolveUrl", () => {
		it("should handle different URL formats correctly", async () => {
			// Test with different URL formats by checking the built queue
			const testCases = [
				{ input: "segment.mp4", expected: "https://example.com/segment.mp4" },
				{ input: "/absolute/segment.mp4", expected: "https://example.com/absolute/segment.mp4" },
				{ input: "https://cdn.example.com/segment.mp4", expected: "https://cdn.example.com/segment.mp4" },
			];

			for (const testCase of testCases) {
				// Create a new downloader instance for each test case to avoid state pollution
				if (mockSegments[0]) mockSegments[0].url = testCase.input;
				const newDownloader = new SegmentDownloader(mockManifest);
				const queue = await newDownloader.download();
				const entry = queue.find((entry) => entry.destFile.includes("0-segment"));
				expect(entry?.url).toBe(testCase.expected);
			}
		});
	});

	describe("edge cases", () => {
		it("should handle segments without init segments", async () => {
			// Remove init segment URLs
			mockSegments.forEach((segment) => {
				delete segment.initSegmentUrl;
			});

			const queue = await downloader.download();

			// Should only have media segments, no init segments
			expect(queue).toHaveLength(2);
			expect(queue.every((entry) => !entry.destFile.includes("init"))).toBe(true);
		});

		it("should handle empty manifest", async () => {
			const emptyManifest: Manifest = {
				url: new URL("https://example.com/manifest.mpd"),
				video: new UniqueRepresentationMap(),
				audio: new UniqueRepresentationMap(),
				images: new UniqueRepresentationMap(),
				captionStreamToLanguage: {},
				periods: [],
			};

			const emptyDownloader = new SegmentDownloader(emptyManifest);
			const queue = await emptyDownloader.download();

			expect(queue).toHaveLength(0);
		});

		it("should handle representation IDs with special characters", async () => {
			mockRepresentation.id = "video/1080p-high/quality";

			const queue = await downloader.download();
			const entry = queue[0];

			// Should replace slashes with dashes in directory name
			expect(entry?.destDir).toContain("representation-video-1080p-high-quality");
		});

		it("should handle download errors gracefully", async () => {
			vi.spyOn(axios, "get").mockRejectedValue(new Error("Network error"));
			vi.spyOn(fs, "access").mockRejectedValue(new Error("File does not exist"));
			const mkdirpSpy = vi.fn().mockResolvedValue(undefined);
			vi.mocked(mkdirp).mockImplementation(mkdirpSpy);

			// Should not throw, errors are handled by PromisePool
			await expect(downloader.download()).resolves.not.toThrow();
		});
	});
});
