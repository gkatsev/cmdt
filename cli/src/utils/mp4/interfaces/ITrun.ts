interface ITrun {
	sampleCount: number;
	sampleData: Array<{
		sampleDuration: number | null;
		sampleSize: number | null;
		sampleCompositionTimeOffset: number | null;
	}>;
	dataOffset: number | null;
}

export default ITrun;
