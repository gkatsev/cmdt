import memfs from 'memfs';
import * as fs from 'node:fs';
export default memfs.fs;
export const realFs = fs;