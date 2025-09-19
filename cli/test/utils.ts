import path from "node:path";
import { realFs as fs } from "../__mocks__/fs.js";

const __dirname = import.meta.dirname;

export async function getTestFile(filePath: string): Promise<string> {
	const data = await fs.promises.readFile(path.resolve(__dirname, filePath), "utf-8");
	return data;
}

export async function getBinaryTestFile(filePath: string): Promise<Buffer> {
	const data = await fs.promises.readFile(path.resolve(__dirname, filePath));
	return data;
}
