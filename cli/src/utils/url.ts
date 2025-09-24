import url from "node:url";

export function wrapUrl(uri: string, origin?: string | URL): URL {
	if (uri.startsWith("http") || uri.startsWith("//")) {
		return new URL(uri, origin);
	}
	return url.pathToFileURL(uri);
}
