import {
	getMediaTypeFromMimeType,
	type ImageRepresentation,
	type Manifest,
	type ManifestParser,
	MediaType,
	type Representation,
	type Segment,
} from "cmdt-shared";
import deepmerge from "deepmerge";
import { parse as parseDuration, toSeconds } from "iso8601-duration";
import xml2js from "xml2js";
import { getInstance as getLogger } from "../logger.js";
import getStreamAndLanguages from "../utils/cea/getStreamAndLanguages.js";
import ECeaSchemeUri from "../utils/manifest/enum/ECeaSchemeUri.js";
import { secondsToMilliseconds } from "../utils/time-utils.js";
import { wrapUrl } from "../utils/url.js";

// biome-ignore lint/suspicious/noExplicitAny: XML Node type isn't known during build time
export type XmlNode = any;

export type DashSegment = Segment & {
	n: number;
};

type CondensedTimeline = {
	time: number;
	segmentDuration: number;
	repeat: number;
};

type SegmentTimeline = CondensedTimeline & {
	segmentDurationMs: number;
	totalDurationMs: number;
};

type SegmentTemplate = {
	timeline: Array<SegmentTimeline>;
	expandedTimeline: Array<DashSegment>;
	timescale: number;
	mediaUriTemplate: string;
	presentationTimeOffset: number;
	presentationTimeOffsetMs: number;
	startNumber: number;
	initSegmentUri?: string;
};

export type DashRepresentation = {
	bandwidth: number;
	codecs?: string;
	height?: number;
	width?: number;
	id: string;
	numChannels?: number;
	spatialAudio?: boolean;
	thumbnailCols?: number;
	thumbnailRows?: number;
	segmentTemplate?: SegmentTemplate;
	xmlRoot: XmlNode;
};

type Accessibility = {
	schemeIdUri: string;
	value: string;
};

export type AdaptationSet = {
	type: string;
	language?: string;
	accessibility?: Accessibility;
	representations?: Array<DashRepresentation>;
	id: string;
	xmlRoot: XmlNode;
};

type Period = {
	start: number;
	absoluteStartMs?: number;
	id: string;
	adaptationSets: Array<AdaptationSet>;
	baseUrl?: string;
	xmlRoot: XmlNode;
};

export type RawManifest = {
	availabilityStartTimeMs?: number;
	minimumUpdatePeriod: number;
	baseUrl?: string;
	periods: Array<Period>;
};

type ParseContext = {
	period: Omit<Period, "adaptationSets">;
	adaptationSet?: Omit<AdaptationSet, "representations">;
	representation?: Omit<DashRepresentation, "segmentTemplate">;
	segmentTemplate?: Omit<SegmentTemplate, "timeline" | "expandedTimeline">;
};

function xmlListify<T>(input?: T | Array<T>): Array<T> {
	if (!input) {
		return [];
	}
	if (Array.isArray(input)) {
		return input;
	}
	return [input];
}

export class DashManifest implements ManifestParser {
	private context: ParseContext | null;
	constructor() {
		this.context = null;
	}
	public async parse(manifestText: string, manifestUrl: string): Promise<Manifest> {
		const root = await xml2js.parseStringPromise(manifestText);
		if (!root.MPD) {
			throw new Error("No MPD element found in manifest");
		}
		const dashManifest = this.getDashManifest(root.MPD, manifestUrl);
		const manifest: Manifest = {
			url: wrapUrl(manifestUrl),
			audio: [],
			video: [],
			images: [],
			captionStreamToLanguage: {},
		};

		for (const period of dashManifest.periods) {
			for (const adaptationSet of period.adaptationSets) {
				const mediaType = getMediaTypeFromMimeType(adaptationSet.type);
				for (const representation of adaptationSet.representations ?? []) {
					let repArray: Array<Representation> | null = null;
					if (mediaType === MediaType.Video) {
						repArray = manifest.video;
					} else if (mediaType === MediaType.Audio) {
						repArray = manifest.audio;
					} else if (mediaType === MediaType.Image) {
						repArray = manifest.images;
					} else {
						getLogger().error(`Unknown media type ${mediaType}`);
						continue;
					}
					let matchingRepresentation = repArray.find((r) => r.id === representation.id);

					if (!matchingRepresentation) {
						matchingRepresentation = {
							segments: [],
							id: representation.id,
							width: representation.width,
							height: representation.height,
							bandwidth: representation.bandwidth,
							codecs: representation.codecs,
							type: mediaType,
							language: adaptationSet.language,
							spatialAudio: representation.spatialAudio,
							numChannels: representation.numChannels,
							hasCaptions: {
								cea608: false,
								cea708: false,
							},
						};
						repArray.push(matchingRepresentation);
					}
					let foundCaptions = false;
					if (adaptationSet.accessibility?.schemeIdUri === ECeaSchemeUri.CEA608) {
						foundCaptions = true;
						matchingRepresentation.hasCaptions.cea608 = true;
					}
					if (adaptationSet.accessibility?.schemeIdUri === ECeaSchemeUri.CEA708) {
						foundCaptions = true;
						matchingRepresentation.hasCaptions.cea708 = true;
					}
					if (foundCaptions) {
						if (!adaptationSet.accessibility) {
							throw new Error(`No accessibility information found for adaptation set ${adaptationSet.id}`);
						}
						const info = getStreamAndLanguages(adaptationSet.accessibility);
						for (const entry of info) {
							manifest.captionStreamToLanguage[entry[0]] = entry[1];
						}
					}

					if (matchingRepresentation.type === MediaType.Image) {
						(matchingRepresentation as ImageRepresentation).imageCols = representation.thumbnailCols ?? 0;
						(matchingRepresentation as ImageRepresentation).imageRows = representation.thumbnailRows ?? 0;
					}
					matchingRepresentation.segments.push(
						...(representation.segmentTemplate?.expandedTimeline ?? []).map((segment: Segment) => {
							return {
								startTime: segment.startTime,
								rawSegmentTime: segment.rawSegmentTime,
								duration: segment.duration,
								url: segment.url,
								initSegmentUrl: segment.initSegmentUrl,
							};
						}),
					);
				}
			}
		}
		return manifest;
	}

	private getDashManifest(mpdRoot: XmlNode, manifestUrl: string): RawManifest {
		const manifest = {
			availabilityStartTimeMs: new Date(mpdRoot.$.availabilityStartTime).getTime(),
			minimumUpdatePeriod: Number.parseInt(mpdRoot.$.minimumUpdatePeriod, 10),
			baseUrl: mpdRoot.BaseURL?.[0] ?? manifestUrl.substring(0, manifestUrl.lastIndexOf("/")),
			periods: [],
		};

		manifest.periods = mpdRoot.Period.map((rawPeriod: XmlNode) => this.parsePeriod(manifest, rawPeriod));
		return manifest;
	}

	private parsePeriod(manifest: RawManifest, root: XmlNode): Period {
		const start = root.$.start ? toSeconds(parseDuration(root.$.start)) : 0;
		const absoluteStartMs = manifest.availabilityStartTimeMs
			? new Date(manifest.availabilityStartTimeMs + start * 1000).getTime()
			: undefined;
		let baseUrl = root.BaseURL?.[0] ?? manifest.baseUrl ?? "";
		if (baseUrl.endsWith("/")) {
			baseUrl = baseUrl.slice(0, -1);
		}
		const periodBase: ParseContext["period"] = {
			xmlRoot: root,
			start,
			absoluteStartMs,
			id: (root.$.id ?? `${start}`).replaceAll("/", "-"),
			baseUrl,
		};
		this.context = { period: periodBase };
		return {
			...periodBase,
			adaptationSets: root.AdaptationSet.map((adaptationRoot: XmlNode) => this.parseAdaptationSet(adaptationRoot)),
		};
	}

	private parseAdaptationSet(root: XmlNode): AdaptationSet {
		if (!this.context) {
			throw new Error("Context required");
		}
		let id = root.$.id ?? `${root.$.mimeType.replace("/", "-")}`;
		if (root.$.lang) {
			id += `-${root.$.lang}`;
		}
		let accessibility: Accessibility | undefined;
		if (root.Accessibility?.[0]) {
			accessibility = {
				schemeIdUri: root.Accessibility[0].$.schemeIdUri,
				value: root.Accessibility[0].$.value,
			};
		}
		const adaptationBase: ParseContext["adaptationSet"] = {
			xmlRoot: root,
			type: root.$.mimeType,
			language: root.$.lang,
			id,
			accessibility,
		};

		this.context.adaptationSet = adaptationBase;

		return {
			...adaptationBase,
			representations: root.Representation.map((representationRoot: XmlNode) =>
				this.parseRepresentation(representationRoot),
			),
		};
	}

	private parseRepresentation(root: XmlNode): DashRepresentation {
		if (!this.context) {
			throw new Error("Context required");
		}
		let thumbnailCols: number | undefined;
		let thumbnailRows: number | undefined;

		for (const essentialProperty of xmlListify(root.EssentialProperty)) {
			if (essentialProperty?.$?.schemeIdUri === "http://dashif.org/guidelines/thumbnail_tile") {
				const value: string = essentialProperty.$.value;
				[thumbnailCols, thumbnailRows] = value.split("x").map((str) => Number.parseInt(str, 10));
			}
		}

		let numChannels: number | undefined;

		for (const audioChannelConfig of xmlListify(root.AudioChannelConfiguration)) {
			switch (audioChannelConfig?.$.schemeIdUri) {
				case "urn:mpeg:mpegB:cicp:ChannelConfiguration":
				case "urn:mpeg:dash:23003:3:audio_channel_configuration:2011":
					numChannels = Number.parseInt(audioChannelConfig.$.value, 10);
					break;
			}
			if (numChannels) {
				break;
			}
		}

		let spatialAudio: boolean | undefined;

		for (const supplementalProperty of xmlListify(root.SupplementalProperty)) {
			if (
				supplementalProperty?.$?.schemeIdUri === "tag:dolby.com,2018:dash:EC3_ExtensionType:2018" &&
				supplementalProperty?.$?.value === "JOC"
			) {
				spatialAudio = true;
			}
		}

		const representatonBase: ParseContext["representation"] = {
			xmlRoot: root,
			bandwidth: Number.parseInt(root.$.bandwidth, 10),
			codecs: root.$.codecs,
			height: Number.parseInt(root.$.height, 10),
			width: Number.parseInt(root.$.width, 10),
			thumbnailCols,
			thumbnailRows,
			numChannels,
			spatialAudio,
			id: root.$.id.replaceAll("/", "-"),
		};

		this.context.representation = representatonBase;

		// If the adaptation set has a segment template, merge it with the representation segment template
		const segmentTemplate = deepmerge(
			root.SegmentTemplate?.[0] ?? {},
			this.context.adaptationSet?.xmlRoot.SegmentTemplate?.[0] ?? {},
			// biome-ignore lint/complexity/noBannedTypes: The data type here is unknown but is an object
		) as Object;

		return {
			...representatonBase,
			segmentTemplate: Object.keys(segmentTemplate).length ? this.parseSegmentTemplate(segmentTemplate) : undefined,
		};
	}

	private parseSegmentTemplate(root: XmlNode): SegmentTemplate {
		if (!this.context) {
			throw new Error("Context required");
		}
		if (!this.context.representation) {
			throw new Error("Representation required");
		}
		const presentationTimeOffset = Number.parseInt(root.$?.presentationTimeOffset ?? "0", 10);
		const timescale = Number.parseInt(root.$.timescale ?? "1", 10);
		const presentationTimeOffsetMs = Math.floor((presentationTimeOffset / timescale) * 1000);
		const startNumber = Number.parseInt(root.$.startNumber ?? "0", 10);
		const mediaUri = root.$.media;
		const segmentTemplateBase: ParseContext["segmentTemplate"] = {
			timescale,
			presentationTimeOffset,
			presentationTimeOffsetMs,
			startNumber,
			mediaUriTemplate: mediaUri,
			initSegmentUri: root.$.initialization
				? this.buildSegmentUrl(
						this.context.period.baseUrl ?? "",
						0,
						this.context.representation?.xmlRoot.$.id,
						root.$.initialization,
					)
				: undefined,
		};
		this.context.segmentTemplate = segmentTemplateBase;
		return {
			...segmentTemplateBase,
			timeline: root.SegmentTimeline?.[0]
				? root.SegmentTimeline[0].S.map((segmentRoot: XmlNode) => this.parseSegment(segmentRoot))
				: [],
			expandedTimeline: root.SegmentTimeline?.[0] ? this.expandTimeline(root.SegmentTimeline[0].S) : [],
		};
	}

	private parseSegment(root: XmlNode): SegmentTimeline {
		if (!this.context) {
			throw new Error("Context required");
		}
		if (!this.context.segmentTemplate) {
			throw new Error("Segment Template required");
		}
		const t = Number.parseInt(root.$.t, 10);
		const duration = Number.parseInt(root.$.d, 10);
		const repeat = root.$.r ? Number.parseInt(root.$.r, 10) : 0;
		return {
			time: t,
			segmentDuration: duration,
			segmentDurationMs: Math.floor((duration / this.context.segmentTemplate.timescale) * 1000),
			repeat,
			totalDurationMs: Math.floor((repeat + 1) * (duration / this.context.segmentTemplate.timescale) * 1000),
		};
	}

	private buildSegmentUrl(
		baseUrl: string,
		segmentNumber: number,
		representationId: string,
		uriTemplate: string,
	): string {
		const widthStr = uriTemplate.match(/\$Number%?0?([0-9]*)d?\$/)?.[1];
		const width = widthStr ? Number.parseInt(widthStr, 10) : 0;
		const paddedNumber = segmentNumber.toString().padStart(width, "0");
		if (baseUrl.endsWith("/")) {
			baseUrl = baseUrl.slice(0, -1);
		}
		let url = uriTemplate.startsWith("http")
			? uriTemplate.replace(/\$Number%?0?[0-9]*d?\$/, paddedNumber)
			: `${baseUrl}/${uriTemplate.replace(/\$Number%?0?[0-9]*d?\$/, paddedNumber)}`;
		url = url.replace(/\$RepresentationID\$/, representationId);
		return url;
	}

	private expandTimeline(root: XmlNode): Array<DashSegment> {
		const segments: Array<DashSegment> = [];
		if (!this.context) {
			throw new Error("Context required");
		}
		if (!this.context.segmentTemplate || !this.context.representation) {
			throw new Error("Segment Template and Representation must be provided");
		}

		let n = this.context.segmentTemplate.startNumber;

		for (const timeline of root) {
			const numSegments = (timeline.$.r ? Number.parseInt(timeline.$.r, 10) : 0) + 1;
			const rawT = Number.parseInt(timeline.$.t, 10);
			const t = rawT - this.context.segmentTemplate.presentationTimeOffset;
			const unscaledDuration = Number.parseInt(timeline.$.d, 10);
			for (let i = 0; i < numSegments; i += 1) {
				const url = this.buildSegmentUrl(
					this.context.period.baseUrl ?? "",
					n,
					this.context.representation.xmlRoot.$.id,
					this.context.segmentTemplate.mediaUriTemplate,
				);
				segments.push({
					initSegmentUrl: this.context.segmentTemplate.initSegmentUri,
					duration: secondsToMilliseconds(unscaledDuration / this.context.segmentTemplate.timescale),
					startTime: secondsToMilliseconds(
						this.context.period.start + (t + i * unscaledDuration) / this.context.segmentTemplate.timescale,
					),
					rawSegmentTime: secondsToMilliseconds((rawT + i * unscaledDuration) / this.context.segmentTemplate.timescale),
					n,
					url,
				});
				n++;
			}
		}

		return segments;
	}
}
