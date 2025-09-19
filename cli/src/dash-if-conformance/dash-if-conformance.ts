import fs from "node:fs/promises";
import path from "node:path";
import axios from "axios";
import { getOpts } from "../cli-opts.js";
import { getInstance as getLogger } from "../logger.js";
import type { Report } from "../report.js";

export class DashIfConformance {
	private logger = getLogger();
	constructor(private manifest: string) {}
	public async run(report: Report): Promise<void> {
		this.logger.info("Running DASH-IF conformance tool...");
		var bodyFormData = new FormData();
		bodyFormData.append("mpd", this.manifest);
		bodyFormData.append("dash", "1");
		bodyFormData.append("iop", "1");
		// biome-ignore lint/suspicious/noExplicitAny: Data is pass-through
		let respData: any;
		try {
			const resp = await axios({
				method: "POST",
				data: bodyFormData,
				url: "https://conformance.dashif.org/Utils/Process_cli.php",
				headers: { "Content-Type": "multipart/form-data" },
			});
			respData = resp.data;
		} catch (e) {
			this.logger.error("Error running DASH-IF conformance tool", e);
			process.exit(1);
		}
		const opts = getOpts();

		const savePath = path.resolve(opts.output, "dash-if-conformance.json");

		await fs.writeFile(savePath, JSON.stringify(respData, null, 2));

		if (respData.entries.Schematron) {
			this.logger.info(`    DASH-IF Conformance Tool | Schematron verdict: ${respData.entries.Schematron.verdict}`);
		}

		for (const mod of respData.enabled_modules) {
			if (respData.entries[mod.name]) {
				this.logger.info(`    DASH-IF Conformance Tool | ${mod.name} verdict: ${respData.entries[mod.name].verdict}`);
			}
		}

		this.logger.info(`DASH-IF Conformance Tool finished and saved results to ${savePath}`);
		report.setDashConformanceReport(respData);
	}
}
