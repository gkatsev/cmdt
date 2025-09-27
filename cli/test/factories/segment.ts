import { Factory } from "fishery";
import type { Segment } from "cmdt-shared";

export const segmentFactory = Factory.define<Segment>(({ sequence }) => {
	return {
		startTime: sequence * 1000,
		duration: 1000,
		url: `segment-${sequence}.mp4`,
		initSegmentUrl: "init.mp4",
	};
});
