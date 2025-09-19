import { describe, expect, it } from "vitest";
import { getTestFile } from "../../test/utils.js";
import { DashManifest } from "./dash.js";

describe("DashManifest", () => {
	it("should parse a DASH manifest", async () => {
		const manifestUrl = "http://example.com/manifest.mpd";
		const testManifest = await getTestFile("manifests/dash-multiperiod.mpd");
		const parser = new DashManifest();
		const manifest = await parser.parse(testManifest, manifestUrl);
		expect(manifest).toMatchSnapshot();
	});
	it("should parse a NowOTT UHD DASH manifest", async () => {
		const manifestUrl = "http://example.com/manifest.mpd";
		const testManifest = await getTestFile("manifests/nowott_uhd.mpd");
		const parser = new DashManifest();
		const manifest = await parser.parse(testManifest, manifestUrl);
		expect(manifest).toMatchSnapshot();
	});
});
