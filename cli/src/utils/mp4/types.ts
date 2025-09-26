import type DataViewReader from "./dataViewReader.js";
import type Mp4Parser from "./parser.js";

export type Emsg = {
	id: number;
	eventDuration: number;
	timescale: number;
	presentationTimeDelta: number;
	schemeIdUri: string;
	value: string;
	messageData: Uint8Array | string;
};

export type Elst = {
	entryCount: number;
	segmentDuration: number;
	mediaTime: number;
	mediaRateInteger: number;
	mediaRateFraction: number;
};

export type Frma = {
	codec: string;
};

export type Iden = {
	id: string;
};

export type Mdat = {
	data: Uint8Array;
};

export type Mdhd = {
	timescale: number;
};

export type Medh = {
	fragmentDuration: number;
};

export type Mvhd = {
	timescale: number;
};

export type ParsedBox = {
	parser: Mp4Parser;
	version: number;
	flags: number;
	reader: DataViewReader;
	size: number;
	type: number;
	name: string;
	start: number;
};

export type Payl = {
	text: string;
};

export type Prft = {
	wallClockTimeSecs: number;
	mediaTime: number;
};

export type SidxReference = {
	referenceType: number;
	referenceSize: number;
	subsegmentDuration: number;
};

export type Sidx = {
	referenceId: number;
	timescale: number;
	earliestPresentationTime: number;
	firstOffset: number;
	references: Array<SidxReference>;
};

export type Sttg = {
	settings: string;
};

export type Tenc = {
	cryptByteBlock: number | null;
	skipByteBlock: number | null;
	isProtected: number;
	perSampleIvSize: number;
	kid: Uint8Array;
	constantIVsize: number | null;
	constantIV: Uint8Array | null;
};

export type Tfdt = {
	baseMediaDecodeTime: number;
};

export type Tfhd = {
	trackId: number;
	defaultSampleDuration: number | null;
	defaultSampleSize: number | null;
	defaultSampleFlags: number | null;
};

export type Tkhd = {
	trackId: number;
};

export type Trex = {
	defaultSampleDuration: number;
	defaultSampleSize: number;
};

export type Trun = {
	sampleCount: number;
	sampleData: Array<{
		sampleDuration: number | null;
		sampleSize: number | null;
		sampleCompositionTimeOffset: number | null;
	}>;
	dataOffset: number | null;
};
