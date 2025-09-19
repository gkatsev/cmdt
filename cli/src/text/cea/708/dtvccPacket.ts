import type winston from "winston";
import { getInstance as getLogger } from "../../../logger.js";
import type ICea708ClosedCaptionByte from "./interfaces/ICea708ClosedCaptionByte.js";

class DtvccPacket {
	private _pos = 0;
	private logger: winston.Logger;

	constructor(private _packetData: Array<ICea708ClosedCaptionByte>) {
		this.logger = getLogger();
	}

	public getPosition(): number {
		return this._pos;
	}

	public hasMoreData(): boolean {
		return this._pos < this._packetData.length;
	}

	// Reads a byte from the packet
	public readByte(): ICea708ClosedCaptionByte {
		const byte = this._packetData[this._pos];
		if (!byte) {
			throw new Error("No byte to read");
		}
		this._pos++;
		return byte;
	}

	// Skips the provided number of blocks in the buffer
	public skip(numBlocks: number): void {
		if (this._pos + numBlocks > this._packetData.length) {
			const message: string = "Buffer position out of bounds";
			this.logger.verbose(message);
		}
		this._pos += numBlocks;
	}
}

export default DtvccPacket;
