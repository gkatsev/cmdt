import type { ColumnDef } from "@tanstack/react-table";
import type { Segment } from "cmdt-shared";
import { DataTable } from "../data-table/data-table";
import { DataTableColumnHeader } from "../data-table/data-table-column-header";

export const columns: ColumnDef<Segment>[] = [
	{
		accessorKey: "startTime",
		header: ({ column }) => <DataTableColumnHeader column={column} title="Start Time" />,
		enableHiding: true,
		sortingFn: "basic",
	},
	{
		accessorKey: "duration",
		header: ({ column }) => <DataTableColumnHeader column={column} title="Duration" />,
		enableHiding: true,
		enableSorting: true,
		sortingFn: "basic",
	},
	{
		accessorKey: "url",
		header: "URL",
		enableHiding: true,
		enableSorting: true,
	},
	{
		accessorKey: "initSegmentUrl",
		header: "Init Segment URL",
		enableHiding: true,
		enableSorting: true,
	},
	{
		accessorKey: "fileSystemPath",
		header: "File System Path",
		enableHiding: true,
		enableSorting: true,
	},
	{
		accessorKey: "initSegmentFilesystemPath",
		header: "Init Segment File System Path",
		enableHiding: true,
		enableSorting: true,
	},
	{
		accessorKey: "baseMediaDecodeTime",
		header: "Base Media Decode Time",
		enableHiding: true,
		enableSorting: true,
	},
	{
		accessorKey: "mediaDuration",
		header: "Media Duration",
		enableHiding: true,
		enableSorting: true,
	},
	{
		accessorKey: "rawSegmentTime",
		header: "Raw Segment Time",
		enableHiding: true,
		enableSorting: true,
	},
];

const defaultVisibleColumns = {
	startTime: true,
	duration: true,
	url: false,
	initSegmentUrl: false,
	fileSystemPath: false,
	initSegmentFilesystemPath: false,
	baseMediaDecodeTime: true,
	mediaDuration: true,
	rawSegmentTime: true,
};

export function SegmentTable(props: { segments: Array<Segment> }) {
	return <DataTable columns={columns} data={props.segments} defaultVisibleColumns={defaultVisibleColumns} />;
}
