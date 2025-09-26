import fs from "node:fs";
import { beforeEach, vi } from "vitest";

vi.mock("fs");
vi.mock("fs/promises");
vi.mock("axios");

vi.mock("../src/cli-opts.js", () => {
	return {
		getOpts: () => ({
			output: "./output",
		}),
	};
});

vi.mock("../src/logger.js", () => {
	return {
		getInstance: () => ({
			info: vi.fn(),
			debug: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
		}),
	};
});

beforeEach(() => {
	vi.spyOn(fs.promises, "access").mockImplementation(async () => {
		return;
	});
});
