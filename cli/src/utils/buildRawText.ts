import type { Text } from "cmdt-shared";

const buildRawText = (texts: Array<Text>): string => {
	return texts
		.map((t: Text) => t.text.trim())
		.join(" ")
		.replace(/[\n\r\t]|\s+/gm, " ")
		.trim();
};

export default buildRawText;
