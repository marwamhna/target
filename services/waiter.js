"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_poller_1 = __importDefault(require("promise-poller"));
class Waiter {
    waitForTaskToFinish(taskFn, progressCallback, polling) {
        const UNLIMITED_TIMEOUT = undefined;
        let effectiveMasterTimeout;
        if (!polling.masterTimeoutMinutes) {
            effectiveMasterTimeout = UNLIMITED_TIMEOUT;
        }
        else {
            effectiveMasterTimeout = polling.masterTimeoutMinutes * 60 * 1000;
        }
        return promise_poller_1.default({
            taskFn,
            progressCallback: (retriesRemaining, error) => progressCallback(error),
            interval: polling.intervalSeconds * 1000,
            masterTimeout: effectiveMasterTimeout,
            retries: Number.MAX_SAFE_INTEGER
        });
    }
}
exports.Waiter = Waiter;
//# sourceMappingURL=waiter.js.map