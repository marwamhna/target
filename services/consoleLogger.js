"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const taskLib = __importStar(require("azure-pipelines-task-lib"));
class ConsoleLogger {
    info(message) {
        console.log(message);
    }
    error(message) {
        // If we don't split the message into lines, taskLib will only highlight the first message line as an error.
        const lines = message.replace('\r\n', '\n')
            .split('\n');
        for (const line of lines) {
            taskLib.error(line);
        }
    }
    debug(message) {
        taskLib.debug(message);
    }
    warning(message) {
        taskLib.warning(message);
    }
}
exports.ConsoleLogger = ConsoleLogger;
//# sourceMappingURL=consoleLogger.js.map