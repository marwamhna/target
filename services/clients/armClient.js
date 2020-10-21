"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const armStatus_1 = require("../../dto/api/armStatus");
const stopwatch_1 = require("../stopwatch");
const waiter_1 = require("../waiter");
/**
 * Works with policy-related APIs.
 */
class ArmClient {
    constructor(httpClient, log) {
        this.httpClient = httpClient;
        this.log = log;
        this.stopwatch = new stopwatch_1.Stopwatch();
        this.armUrl = '';
        this.logWaitingProgress = (armStatus) => {
            this.log.info(`Waiting for server to retrieve policy violations. Elapsed time: ${this.stopwatch.getElapsedString()}. Status: ${armStatus}`);
        };
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.info('Resolving CxARM URL.');
            const response = yield this.httpClient.getRequest('Configurations/Portal');
            this.armUrl = response.cxARMPolicyURL;
            this.log.debug(`Resolved CxARM URL: ${this.armUrl}`);
        });
    }
    waitForArmToFinish(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.stopwatch.start();
            this.log.info('Waiting for server to retrieve policy violations.');
            let lastStatus = armStatus_1.ArmStatus.None;
            try {
                const waiter = new waiter_1.Waiter();
                lastStatus = yield waiter.waitForTaskToFinish(() => this.checkIfPolicyVerificationCompleted(projectId), this.logWaitingProgress, ArmClient.pollingSettings);
            }
            catch (e) {
                throw Error(`Waiting for server to retrieve policy violations has reached the time limit. (${ArmClient.pollingSettings.masterTimeoutMinutes} minutes).`);
            }
            if (lastStatus !== armStatus_1.ArmStatus.Finished) {
                throw Error(`Generation of scan report [id=${projectId}] failed.`);
            }
        });
    }
    getProjectViolations(projectId, provider) {
        const path = `/cxarm/policymanager/projects/${projectId}/violations?provider=${provider}`;
        return this.httpClient.getRequest(path, { baseUrlOverride: this.armUrl });
    }
    checkIfPolicyVerificationCompleted(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const path = `sast/projects/${projectId}/publisher/policyFindings/status`;
            const statusResponse = yield this.httpClient.getRequest(path);
            const { status } = statusResponse;
            const isCompleted = status === armStatus_1.ArmStatus.Finished ||
                status === armStatus_1.ArmStatus.Failed ||
                status === armStatus_1.ArmStatus.None;
            if (isCompleted) {
                return Promise.resolve(status);
            }
            else {
                return Promise.reject(status);
            }
        });
    }
    ;
}
exports.ArmClient = ArmClient;
ArmClient.pollingSettings = {
    intervalSeconds: 10,
    masterTimeoutMinutes: 20
};
//# sourceMappingURL=armClient.js.map