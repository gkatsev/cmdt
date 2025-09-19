import type ISidxReference from "./ISidxReference.js";

interface ISidx {
	referenceId: number;
	timescale: number;
	earliestPresentationTime: number;
	firstOffset: number;
	references: Array<ISidxReference>;
}

export default ISidx;
