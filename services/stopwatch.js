"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parseMilliseconds = require("parse-ms");
class Stopwatch {
    constructor() {
        this.lastOperationStart = new Date(0);
    }
    start() {
        this.lastOperationStart = new Date();
    }
    getElapsedString() {
        let duration = parseMilliseconds(Date.now() - this.lastOperationStart.getTime());
        return `${Stopwatch.pad(duration.hours)}:${Stopwatch.pad(duration.minutes)}:${Stopwatch.pad(duration.seconds)}`;
    }
    getElapsedSeconds() {
        const elapsedMilliseconds = Date.now() - this.lastOperationStart.getTime();
        const millisecondsInSecond = 1000;
        return Math.round(elapsedMilliseconds / millisecondsInSecond);
    }
    static pad(input) {
        const padding = input < 10 ? '0' : '';
        return padding + input;
    }
}
exports.Stopwatch = Stopwatch;
//# sourceMappingURL=stopwatch.js.map