import type { ImageRepresentation, Period, Report as ReportData } from "cmdt-shared";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AudioRepresentations from "./components/manifest/audio-representations";
import Captions from "./components/manifest/captions";
import DashIfConformance from "./components/manifest/dash-if-conformance";
import ImageRepresentations from "./components/manifest/image-representations";
import MissingCaptions from "./components/manifest/missing-captions";
import Periods from "./components/manifest/periods";
import VideoRepresentations from "./components/manifest/video-representations";

export default function Report(props: { rawReport: ReportData }) {
	const { rawReport } = props;
	return (
		<div>
			<Tabs defaultValue="manifest">
				<TabsList>
					<TabsTrigger value="manifest">Manifest</TabsTrigger>
					<TabsTrigger value="missing-captions">Missing Captions</TabsTrigger>
					<TabsTrigger value="dash-if-conformance">DASH-IF Conformance</TabsTrigger>
					<TabsTrigger value="captions">Captions</TabsTrigger>
				</TabsList>
				<TabsContent value="manifest">
					<Accordion type="single" collapsible className="w-full">
						<AccordionItem value="item-1">
							<AccordionTrigger>Audio Representations</AccordionTrigger>
							<AccordionContent>
								<AudioRepresentations representations={rawReport.manifest.audio} />
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="item-2">
							<AccordionTrigger>Video Representations</AccordionTrigger>
							<AccordionContent>
								<VideoRepresentations representations={rawReport.manifest.video} />
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="item-3">
							<AccordionTrigger>Image Representations</AccordionTrigger>
							<AccordionContent>
								<ImageRepresentations representations={rawReport.manifest.images as ImageRepresentation[]} />
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="item-4">
							<AccordionTrigger>Periods</AccordionTrigger>
							<AccordionContent>
								<Periods periods={rawReport.manifest.periods as Period[]} />
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</TabsContent>
				<TabsContent value="missing-captions">
					<MissingCaptions report={rawReport} />
				</TabsContent>
				<TabsContent value="dash-if-conformance">
					<DashIfConformance report={rawReport} />
				</TabsContent>
				<TabsContent value="captions">
					<Captions report={rawReport} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
