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
const scanStage_1 = require("../../dto/api/scanStage");
const stopwatch_1 = require("../stopwatch");
const waiter_1 = require("../waiter");
class SastClient {
    constructor(config, httpClient, log) {
        this.config = config;
        this.httpClient = httpClient;
        this.log = log;
        this.stopwatch = new stopwatch_1.Stopwatch();
        this.scanId = 0;
        this.checkIfScanFinished = () => {
            return new Promise((resolve, reject) => {
                this.httpClient.getRequest(`sast/scansQueue/${this.scanId}`)
                    .then((scanStatus) => {
                    if (SastClient.isInProgress(scanStatus)) {
                        reject(scanStatus);
                    }
                    else {
                        resolve(scanStatus);
                    }
                });
            });
        };
        this.logWaitingProgress = (scanStatus) => {
            const elapsed = this.stopwatch.getElapsedString();
            const stage = scanStatus && scanStatus.stage ? scanStatus.stage.value : 'n/a';
            this.log.info(`Waiting for SAST scan results. Elapsed time: ${elapsed}. ${scanStatus.totalPercent}% processed. Status: ${stage}.`);
        };
    }
    getPresetIdByName(presetName) {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.debug(`Getting preset ID by name: [${presetName}]`);
            const allPresets = yield this.httpClient.getRequest('sast/presets');
            const currentPresetName = this.config.presetName.toUpperCase();
            let result = 0;
            for (const preset of allPresets) {
                if (preset.name.toUpperCase() === currentPresetName) {
                    result = preset.id;
                    break;
                }
            }
            if (result) {
                this.log.debug(`Resolved preset ID: ${result}`);
            }
            else {
                throw Error(`Could not resolve preset ID from preset name: ${presetName}`);
            }
            return result;
        });
    }
    getScanSettings(projectId) {
        this.log.info('Getting scan settings.');
        return this.httpClient.getRequest(`sast/scanSettings/${projectId}`);
    }
    createScan(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = {
                projectId,
                isIncremental: this.config.isIncremental,
                isPublic: this.config.isPublic,
                forceScan: this.config.forceScan,
                comment: this.config.comment
            };
            const scan = yield this.httpClient.postRequest('sast/scans', request);
            this.scanId = scan.id;
            this.stopwatch.start();
            return scan.id;
        });
    }
    getScanStatistics(scanId) {
        return this.httpClient.getRequest(`sast/scans/${scanId}/resultsStatistics`);
    }
    updateScanSettings(request) {
        this.log.info('Updating scan settings.');
        return this.httpClient.putRequest('sast/pluginsScanSettings', request);
    }
    waitForScanToFinish() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.info('Waiting for CxSAST scan to finish.');
            const polling = {
                masterTimeoutMinutes: this.config.scanTimeoutInMinutes,
                intervalSeconds: SastClient.POLLING_INTERVAL_IN_SECONDS
            };
            let lastStatus;
            const waiter = new waiter_1.Waiter();
            try {
                lastStatus = yield waiter.waitForTaskToFinish(this.checkIfScanFinished, this.logWaitingProgress, polling);
            }
            catch (e) {
                throw Error(`Waiting for CxSAST scan has reached the time limit (${polling.masterTimeoutMinutes} minutes).`);
            }
            if (SastClient.isFinishedSuccessfully(lastStatus)) {
                this.log.info('SAST scan successfully finished.');
            }
            else {
                SastClient.throwScanError(lastStatus);
            }
        });
    }
    static throwScanError(status) {
        let details = '';
        if (status) {
            const stage = status.stage ? status.stage.value : '';
            details = `Status [${stage}]: ${status.stageDetails}`;
        }
        throw Error(`SAST scan cannot be completed. ${details}`);
    }
    static isFinishedSuccessfully(status) {
        return status && status.stage &&
            (status.stage.value === scanStage_1.ScanStage.Finished ||
                status.stageDetails === SastClient.SCAN_COMPLETED_MESSAGE);
    }
    static isInProgress(scanStatus) {
        let result = false;
        if (scanStatus && scanStatus.stage) {
            const stage = scanStatus.stage.value;
            result =
                stage !== scanStage_1.ScanStage.Finished &&
                    stage !== scanStage_1.ScanStage.Failed &&
                    stage !== scanStage_1.ScanStage.Canceled &&
                    stage !== scanStage_1.ScanStage.Deleted &&
                    scanStatus.stageDetails !== SastClient.SCAN_COMPLETED_MESSAGE;
        }
        return result;
    }
}
exports.SastClient = SastClient;
SastClient.POLLING_INTERVAL_IN_SECONDS = 10;
SastClient.SCAN_COMPLETED_MESSAGE = 'Scan completed';
//# sourceMappingURL=sastClient.js.map