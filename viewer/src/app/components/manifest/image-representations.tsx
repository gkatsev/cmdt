import type { ImageRepresentation } from "cmdt-shared";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ImageRepresentations(props: { representations: Array<ImageRepresentation> }) {
	const reps = props.representations.map((representation) => {
		return (
			<TableRow key={representation.id}>
				<TableCell className="font-medium">{representation.id}</TableCell>
				<TableCell>{representation.bandwidth}</TableCell>
				<TableCell>
					{representation.width}x{representation.height}
				</TableCell>
				<TableCell>
					{representation.imageRows}x{representation.imageCols}
				</TableCell>
			</TableRow>
		);
	});
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[100px]">ID</TableHead>
					<TableHead>Bandwidth</TableHead>
					<TableHead>Resolution</TableHead>
					<TableHead>Grid Dimensions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>{reps}</TableBody>
		</Table>
	);
}
