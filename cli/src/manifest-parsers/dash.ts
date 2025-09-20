import {
	getMediaTypeFromMimeType,
	type ImageRepresentation,
	type Manifest,
	type ManifestParser,
	MediaType,
	type Representation,
	type Segment,
} from "cmdt-shared";
import { getRawDashManifest } from "./raw-dash.js";
export class DashManifest implements ManifestParser {
	public async parse(manifest: string, manifestUrl: string): Promise<Manifest> {
		const mpd = await getRawDashManifest(manifest, manifestUrl);
		return this.parseRawManifest(mpd, manifestUrl);
	}
}
