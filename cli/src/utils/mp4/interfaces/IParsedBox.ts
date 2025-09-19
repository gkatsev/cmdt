import type DataViewReader from "../dataViewReader.js";
import type Mp4Parser from "../parser.js";

interface IParsedBox {
	parser: Mp4Parser;
	version: number;
	flags: number;
	reader: DataViewReader;
	size: number;
	type: number;
	name: string;
	start: number;
}

export default IParsedBox;
