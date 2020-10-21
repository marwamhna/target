"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tmp_1 = require("tmp");
const taskLib = require("azure-pipelines-task-lib/task");
class FileUtil {
    static generateTempFileName(options) {
        // A temporary folder that is cleaned after each pipeline run, so that we don't have to remove
        // temp files manually.
        const tempDir = taskLib.getVariable('Agent.TempDirectory');
        // If the agent variable above is not specified (e.g. in debug environment), tempDir is undefined and
        // tmpNameSync function falls back to a default temp directory.
        return tmp_1.tmpNameSync(Object.assign({ dir: tempDir }, options));
    }
}
exports.FileUtil = FileUtil;
//# sourceMappingURL=fileUtil.js.map