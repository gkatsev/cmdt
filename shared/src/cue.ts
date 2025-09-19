export type RegionScroll = "none" | "up";
export type RegionAlignment = "auto" | "left" | "right" | "start" | "end" | "center";

export type Style = {
	backgroundColor?: string;
	color?: string;
	fontFamily?: string;
	fontSize?: string;
	textAlign?: string;
	textDecoration?: string;
	fontWeight?: string;
	fontStyle?: string;
	zIndex?: number;
};

// all values are in percentage
export type Region = {
	width: number;
	height: number; // lines = height% / 5.33vh
	regionAnchorX: number;
	regionAnchorY: number;
	viewportanchorX: number;
	viewportanchorY: number;
	align: RegionAlignment;
	style: Style | null;
	scroll: RegionScroll;
};

export type Text = {
	text: string;
	style: Style | null;
};

export type Cue = {
	id: string;
	begin: number;
	end: number;
	position: number;
	texts: Array<Text>;
	rawText: string;
	lang: string;
	region: Region | null;
	offset: number;
};
