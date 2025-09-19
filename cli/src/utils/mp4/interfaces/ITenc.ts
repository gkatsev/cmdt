interface ITenc {
	cryptByteBlock: number | null;
	skipByteBlock: number | null;
	isProtected: number;
	perSampleIvSize: number;
	kid: Uint8Array;
	constantIVsize: number | null;
	constantIV: Uint8Array | null;
}

export default ITenc;
