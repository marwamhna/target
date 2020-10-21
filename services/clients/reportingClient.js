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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const waiter_1 = require("../waiter");
const reportStatus_1 = require("../../dto/api/reportStatus");
const stopwatch_1 = require("../stopwatch");
const xml2js = __importStar(require("xml2js"));
/**
 * Uses Cx API to generate and download XMl reports.
 */
class ReportingClient {
    constructor(httpClient, log) {
        this.httpClient = httpClient;
        this.log = log;
        this.stopwatch = new stopwatch_1.Stopwatch();
        this.logWaitingProgress = () => {
            const timeout = ReportingClient.pollingSettings.masterTimeoutMinutes;
            let secondsLeft = timeout * 60 - this.stopwatch.getElapsedSeconds();
            if (secondsLeft < 0) {
                secondsLeft = 0;
            }
            this.log.info(`Waiting for server to generate ${ReportingClient.REPORT_TYPE} report. ${secondsLeft} seconds left to timeout.`);
        };
    }
    generateReport(scanId) {
        return __awaiter(this, void 0, void 0, function* () {
            const reportId = yield this.startReportGeneration(scanId);
            this.log.info("ReportId: " + reportId);
            yield this.waitForReportGenerationToFinish(reportId);
            return this.getReport(reportId);
        });
    }
    startReportGeneration(scanId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Added delay for sync issue with SAST REST API - create report
            yield this.delay(5555);
            const request = {
                scanId: scanId,
                reportType: ReportingClient.REPORT_TYPE
            };
            const response = yield this.httpClient.postRequest('reports/sastScan', request);
            return response.reportId;
        });
    }
    waitForReportGenerationToFinish(reportId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.stopwatch.start();
            this.log.info(`Waiting for server to generate ${ReportingClient.REPORT_TYPE} report.`);
            let lastStatus;
            try {
                const waiter = new waiter_1.Waiter();
                lastStatus = yield waiter.waitForTaskToFinish(() => this.checkIfReportIsCompleted(reportId), this.logWaitingProgress, ReportingClient.pollingSettings);
            }
            catch (e) {
                throw Error(`Waiting for ${ReportingClient.REPORT_TYPE} report generation has reached the time limit (${ReportingClient.pollingSettings.masterTimeoutMinutes} minutes).`);
            }
            if (lastStatus === reportStatus_1.ReportStatus.Created) {
                this.log.info(`${ReportingClient.REPORT_TYPE} report was created successfully.`);
            }
            else {
                throw Error(`${ReportingClient.REPORT_TYPE} report cannot be generated. Status [${lastStatus}].`);
            }
        });
    }
    getReport(reportId) {
        return __awaiter(this, void 0, void 0, function* () {
            const reportBytes = yield this.httpClient.getRequest(`reports/sastScan/${reportId}`);
            const reportBuffer = new Buffer(reportBytes);
            return xml2js.parseStringPromise(reportBuffer);
        });
    }
    delay(ms) {
        this.log.debug("Activating delay for: " + ms);
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    checkIfReportIsCompleted(reportId) {
        return __awaiter(this, void 0, void 0, function* () {
            const path = `reports/sastScan/${reportId}/status`;
            let time = new Date();
            // Added delay for sync issue with SAST REST API - status check
            yield this.delay(5555);
            let response = yield this.httpClient.getRequest(path);
            let status = response.status.value;
            if (status === reportStatus_1.ReportStatus.Failed) {
                this.log.warning("Failed on first report status request");
                for (let i = 1; i < 5; i++) {
                    yield this.delay(5555);
                    response = yield this.httpClient.getRequest(path);
                    status = response.status.value;
                    time = new Date();
                    this.log.warning("Time " + time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds() + ": Scan status of request number: " + (i + 1) + ": [" + status + "], requested path: + " + path);
                    if (status !== reportStatus_1.ReportStatus.Failed) {
                        break;
                    }
                }
            }
            const isCompleted = status === reportStatus_1.ReportStatus.Deleted ||
                status === reportStatus_1.ReportStatus.Failed ||
                status === reportStatus_1.ReportStatus.Created;
            if (isCompleted) {
                return Promise.resolve(status);
            }
            else {
                return Promise.reject(status);
            }
        });
    }
}
exports.ReportingClient = ReportingClient;
ReportingClient.REPORT_TYPE = 'XML';
ReportingClient.pollingSettings = {
    intervalSeconds: 5,
    masterTimeoutMinutes: 8
};
//# sourceMappingURL=reportingClient.js.map