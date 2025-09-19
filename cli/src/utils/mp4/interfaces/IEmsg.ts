interface IEmsg {
	id: number;
	eventDuration: number;
	timescale: number;
	presentationTimeDelta: number;
	schemeIdUri: string;
	value: string;
	messageData: Uint8Array | string;
}

export default IEmsg;
