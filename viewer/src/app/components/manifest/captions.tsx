"use client";

import type { ColumnDef } from "@tanstack/react-table";

import type { Cue, Report } from "cmdt-shared";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DataTable } from "../data-table/data-table";

export type Caption = {
	id: string;
	begin: number;
	end: number;
	position: number;
	text: string;
	lang: string;
	regionWidth: number;
	regionHeight: number;
	regionAnchorX: number;
	regionAnchorY: number;
	viewportAnchorX: number;
	viewportAnchorY: number;
	align: string;
	style: string | null;
	scroll: string;
	offset: number;
};

export const defaultVisibleColumns = {
	id: false,
	begin: true,
	end: false,
	position: false,
	text: true,
	lang: false,
	regionWidth: false,
	regionHeight: false,
	regionAnchorX: false,
	regionAnchorY: false,
	viewportAnchorX: false,
	viewportAnchorY: false,
	align: false,
	style: false,
	scroll: false,
};

export const columns: ColumnDef<Caption>[] = [
	{
		accessorKey: "id",
		header: "ID",
		enableHiding: true,
	},
	{
		accessorKey: "begin",
		header: "Begin",
	},
	{
		accessorKey: "end",
		header: "End",
		enableHiding: true,
	},
	{
		accessorKey: "position",
		header: "Position",
		enableHiding: true,
	},
	{
		accessorKey: "text",
		header: "Text",
	},
	{
		accessorKey: "lang",
		header: "Language",
		enableHiding: true,
	},
	{
		accessorKey: "regionWidth",
		header: "Region Width",
		enableHiding: true,
	},
	{
		accessorKey: "regionHeight",
		header: "Region Height",
		enableHiding: true,
	},
	{
		accessorKey: "regionAnchorX",
		header: "Region Anchor X",
		enableHiding: true,
	},
	{
		accessorKey: "regionAnchorY",
		header: "Region Anchor Y",
		enableHiding: true,
	},
	{
		accessorKey: "viewportAnchorX",
		header: "Viewport Anchor X",
		enableHiding: true,
	},
	{
		accessorKey: "viewportAnchorY",
		header: "Viewport Anchor Y",
		enableHiding: true,
	},
	{
		accessorKey: "align",
		header: "Align",
		enableHiding: true,
	},
	{
		accessorKey: "style",
		header: "Style",
		enableHiding: true,
	},
	{
		accessorKey: "scroll",
		header: "Scroll",
		enableHiding: true,
	},
	{
		accessorKey: "offset",
		header: "Offset",
		enableHiding: true,
	},
];

function cueToCaption(cue: Cue, text?: string): Caption {
	return {
		id: cue.id,
		begin: cue.begin,
		end: cue.end,
		position: cue.position,
		text: text ?? cue.rawText,
		lang: cue.lang,
		regionWidth: cue.region?.width || 0,
		regionHeight: cue.region?.height || 0,
		regionAnchorX: cue.region?.regionAnchorX || 0,
		regionAnchorY: cue.region?.regionAnchorY || 0,
		viewportAnchorX: cue.region?.viewportanchorX || 0,
		viewportAnchorY: cue.region?.viewportanchorY || 0,
		align: cue.region?.align || "",
		style: cue.region?.style ? JSON.stringify(cue.region.style) : null,
		scroll: cue.region?.scroll || "",
		offset: cue.offset,
	};
}

export function CaptionTable(props: { cues: Array<Cue> }) {
	const data = props.cues.reduce((acc: Array<Caption>, cue: Cue) => {
		for (let i = 0; i < cue.texts.length; i++) {
			const text = cue.texts[i];
			acc.push(cueToCaption({ ...cue, id: `${cue.id}_${i}` }, text.text));
		}
		return acc;
	}, []);
	return <DataTable columns={columns} data={data} defaultVisibleColumns={defaultVisibleColumns} />;
}

export default function Captions(props: { report: Report }) {
	const { captions } = props.report;
	if (!captions) {
		return null;
	}
	const captionItems = Object.keys(captions).map((key) => {
		return (
			<AccordionItem value={`captions-${key}`} key={`captions-${key}`}>
				<AccordionTrigger>{key}</AccordionTrigger>
				<AccordionContent>
					<CaptionTable cues={captions[key]}></CaptionTable>
				</AccordionContent>
			</AccordionItem>
		);
	});
	return (
		<Accordion type="single" collapsible className="w-full">
			{captionItems}
		</Accordion>
	);
}
