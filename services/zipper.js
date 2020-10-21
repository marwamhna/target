"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const archiver_1 = __importDefault(require("archiver"));
const walk_1 = require("walk");
const upath = __importStar(require("upath"));
class Zipper {
    constructor(log, filenameFilter) {
        this.log = log;
        this.filenameFilter = filenameFilter;
        this.srcDir = '';
        this.totalAddedFiles = 0;
        this.addFileToArchive = (parentDir, fileStats, discoverNextFile) => {
            const absoluteFilePath = upath.resolve(parentDir, fileStats.name);
            const relativeFilePath = upath.relative(this.srcDir, absoluteFilePath);
            // relativeFilePath is normalized to contain forward slashes independent of the current OS. Examples:
            //      page.cs                             - if page.cs is at the project's root dir
            //      services/internal/myservice.js      - if myservice.js is in a nested dir
            if (this.filenameFilter.includes(relativeFilePath)) {
                this.log.debug(` Add: ${absoluteFilePath}`);
                const relativeDirInArchive = upath.relative(this.srcDir, parentDir);
                this.archiver.file(absoluteFilePath, {
                    name: fileStats.name,
                    prefix: relativeDirInArchive
                });
            }
            else {
                this.log.debug(`Skip: ${absoluteFilePath}`);
            }
            discoverNextFile();
        };
    }
    zipDirectory(srcDir, targetPath) {
        this.srcDir = srcDir;
        this.totalAddedFiles = 0;
        return new Promise((resolve, reject) => {
            this.archiver = this.createArchiver(reject);
            const zipOutput = this.createOutputStream(targetPath, resolve);
            this.archiver.pipe(zipOutput);
            this.log.debug('Discovering files in source directory.');
            // followLinks is set to true to conform to Common Client behavior.
            const walker = walk_1.walk(this.srcDir, { followLinks: true });
            walker.on('file', this.addFileToArchive);
            walker.on('end', () => {
                this.log.debug('Finished discovering files in source directory.');
                this.archiver.finalize();
            });
        });
    }
    createArchiver(reject) {
        const result = archiver_1.default('zip', { zlib: { level: 9 } });
        result.on('warning', (err) => {
            this.log.warning(`Archiver: ${err.message}`);
        });
        result.on('error', (err) => {
            reject(err);
        });
        result.on('progress', (data) => {
            this.totalAddedFiles = data.entries.processed;
        });
        return result;
    }
    createOutputStream(targetPath, resolve) {
        const result = fs.createWriteStream(targetPath);
        result.on('close', () => {
            const zipResult = {
                fileCount: this.totalAddedFiles
            };
            this.log.info(`Acrhive creation completed. Total bytes written: ${this.archiver.pointer()}, files: ${this.totalAddedFiles}.`);
            resolve(zipResult);
        });
        return result;
    }
}
exports.default = Zipper;
//# sourceMappingURL=zipper.js.map