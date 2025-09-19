import memfs from 'memfs';
import * as fs from 'node:fs';
export default memfs.fs.promises;
export const realFs = fs;