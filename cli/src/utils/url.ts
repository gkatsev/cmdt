import url from "node:url";

export function wrapUrl(uri: string): URL {
	if (uri.startsWith("http") || uri.startsWith("//")) {
		return new URL(uri);
	}
	return url.pathToFileURL(uri);
}
