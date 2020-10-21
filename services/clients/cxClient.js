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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const httpClient_1 = require("./httpClient");
const zipper_1 = __importDefault(require("../zipper"));
const taskSkippedError_1 = require("../../dto/taskSkippedError");
const scanResults_1 = require("../../dto/scanResults");
const sastClient_1 = require("./sastClient");
const url = __importStar(require("url"));
const armClient_1 = require("./armClient");
const reportingClient_1 = require("./reportingClient");
const scanSummaryEvaluator_1 = require("../scanSummaryEvaluator");
const filePathFilter_1 = require("../filePathFilter");
const fileUtil_1 = require("../fileUtil");
const teamApiClient_1 = require("./teamApiClient");
/**
 * High-level CX API client that uses specialized clients internally.
 */
class CxClient {
    constructor(log) {
        this.log = log;
        this.teamId = 0;
        this.projectId = 0;
        this.presetId = 0;
        this.isPolicyEnforcementSupported = false;
    }
    scan(config) {
        return __awaiter(this, void 0, void 0, function* () {
            this.config = config;
            this.log.info('Initializing Cx client');
            yield this.initClients();
            yield this.initDynamicFields();
            let result = yield this.createSASTScan();
            if (config.isSyncMode) {
                result = yield this.getSASTResults(result);
            }
            else {
                this.log.info('Running in Asynchronous mode. Not waiting for scan to finish.');
            }
            return result;
        });
    }
    initClients() {
        return __awaiter(this, void 0, void 0, function* () {
            const baseUrl = url.resolve(this.config.serverUrl, 'CxRestAPI/');
            this.httpClient = new httpClient_1.HttpClient(baseUrl, this.log);
            yield this.httpClient.login(this.config.username, this.config.password);
            this.sastClient = new sastClient_1.SastClient(this.config, this.httpClient, this.log);
            this.armClient = new armClient_1.ArmClient(this.httpClient, this.log);
            if (this.config.enablePolicyViolations) {
                yield this.armClient.init();
            }
        });
    }
    createSASTScan() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.info('-----------------------------------Create CxSAST Scan:-----------------------------------');
            yield this.updateScanSettings();
            yield this.uploadSourceCode();
            const scanResult = new scanResults_1.ScanResults(this.config);
            scanResult.scanId = yield this.sastClient.createScan(this.projectId);
            const projectStateUrl = url.resolve(this.config.serverUrl, `CxWebClient/portal#/projectState/${this.projectId}/Summary`);
            this.log.info(`SAST scan created successfully. CxLink to project state: ${projectStateUrl}`);
            return scanResult;
        });
    }
    delay(ms) {
        this.log.debug("Activating delay for: " + ms);
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getSASTResults(result) {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.info('------------------------------------Get CxSAST Results:----------------------------------');
            this.log.info('Retrieving SAST scan results');
            yield this.sastClient.waitForScanToFinish();
            yield this.addStatisticsToScanResults(result);
            yield this.addPolicyViolationsToScanResults(result);
            this.printStatistics(result);
            yield this.addDetailedReportToScanResults(result);
            const evaluator = new scanSummaryEvaluator_1.ScanSummaryEvaluator(this.config, this.log, this.isPolicyEnforcementSupported);
            const summary = evaluator.getScanSummary(result);
            this.logPolicyCheckSummary(summary.policyCheck);
            if (summary.hasErrors()) {
                result.buildFailed = true;
                this.logBuildFailure(summary);
            }
            return result;
        });
    }
    getOrCreateProject() {
        return __awaiter(this, void 0, void 0, function* () {
            let projectId = yield this.getCurrentProjectId();
            if (projectId) {
                this.log.debug(`Resolved project ID: ${projectId}`);
            }
            else {
                this.log.info('Project not found, creating a new one.');
                if (this.config.denyProject) {
                    throw Error(`Creation of the new project [${this.config.projectName}] is not authorized. Please use an existing project.` +
                        " You can enable the creation of new projects by disabling the Deny new Checkmarx projects creation checkbox in the Checkmarx plugin global settings.");
                }
                projectId = yield this.createNewProject();
            }
            return projectId;
        });
    }
    uploadSourceCode() {
        return __awaiter(this, void 0, void 0, function* () {
            const tempFilename = fileUtil_1.FileUtil.generateTempFileName({ prefix: 'cxsrc-', postfix: '.zip' });
            this.log.info(`Zipping source code at ${this.config.sourceLocation} into file ${tempFilename}`);
            const filter = new filePathFilter_1.FilePathFilter(this.config.fileExtension, this.config.folderExclusion);
            const zipper = new zipper_1.default(this.log, filter);
            const zipResult = yield zipper.zipDirectory(this.config.sourceLocation, tempFilename);
            if (zipResult.fileCount === 0) {
                throw new taskSkippedError_1.TaskSkippedError('Zip file is empty: no source to scan');
            }
            this.log.info(`Uploading the zipped source code.`);
            const urlPath = `projects/${this.projectId}/sourceCode/attachments`;
            yield this.httpClient.postMultipartRequest(urlPath, { id: this.projectId }, { zippedSource: tempFilename });
        });
    }
    getCurrentProjectId() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.info(`Resolving project: ${this.config.projectName}`);
            let result;
            const encodedName = encodeURIComponent(this.config.projectName);
            const path = `projects?projectname=${encodedName}&teamid=${this.teamId}`;
            try {
                const projects = yield this.httpClient.getRequest(path, { suppressWarnings: true });
                if (projects && projects.length) {
                    result = projects[0].id;
                }
            }
            catch (err) {
                const isExpectedError = err.response && err.response.notFound;
                if (!isExpectedError) {
                    throw err;
                }
            }
            return result;
        });
    }
    createNewProject() {
        return __awaiter(this, void 0, void 0, function* () {
            const request = {
                name: this.config.projectName,
                owningTeam: this.teamId,
                isPublic: this.config.isPublic
            };
            const newProject = yield this.httpClient.postRequest('projects', request);
            this.log.debug(`Created new project, ID: ${newProject.id}`);
            return newProject.id;
        });
    }
    updateScanSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            const settingsResponse = yield this.sastClient.getScanSettings(this.projectId);
            const configurationId = settingsResponse &&
                settingsResponse.engineConfiguration &&
                settingsResponse.engineConfiguration.id;
            const request = {
                projectId: this.projectId,
                presetId: this.presetId,
                engineConfigurationId: configurationId || 0
            };
            yield this.sastClient.updateScanSettings(request);
        });
    }
    addPolicyViolationsToScanResults(result) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.enablePolicyViolations) {
                return;
            }
            if (!this.isPolicyEnforcementSupported) {
                this.log.warning('Policy enforcement is not supported by the current Checkmarx server version.');
                return;
            }
            yield this.armClient.waitForArmToFinish(this.projectId);
            const projectViolations = yield this.armClient.getProjectViolations(this.projectId, 'SAST');
            for (const policy of projectViolations) {
                result.sastPolicies.push(policy.policyName);
                for (const violation of policy.violations) {
                    result.sastViolations.push({
                        libraryName: violation.source,
                        policyName: policy.policyName,
                        ruleName: violation.ruleName,
                        detectionDate: (new Date(violation.firstDetectionDateByArm)).toLocaleDateString()
                    });
                }
            }
        });
    }
    addStatisticsToScanResults(result) {
        return __awaiter(this, void 0, void 0, function* () {
            const statistics = yield this.sastClient.getScanStatistics(result.scanId);
            result.highResults = statistics.highSeverity;
            result.mediumResults = statistics.mediumSeverity;
            result.lowResults = statistics.lowSeverity;
            result.infoResults = statistics.infoSeverity;
            const sastScanPath = `CxWebClient/ViewerMain.aspx?scanId=${result.scanId}&ProjectID=${this.projectId}`;
            result.sastScanResultsLink = url.resolve(this.config.serverUrl, sastScanPath);
            const sastProjectLink = `CxWebClient/portal#/projectState/${this.projectId}/Summary`;
            result.sastSummaryResultsLink = url.resolve(this.config.serverUrl, sastProjectLink);
            result.sastResultsReady = true;
        });
    }
    addDetailedReportToScanResults(result) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = new reportingClient_1.ReportingClient(this.httpClient, this.log);
            let reportXml;
            for (let i = 1; i < 25; i++) {
                try {
                    reportXml = yield client.generateReport(result.scanId);
                    if (typeof reportXml !== 'undefined' && reportXml !== null) {
                        break;
                    }
                    yield this.delay(5555);
                }
                catch (e) {
                    this.log.warning('Failed to generate report on attempt number: ' + i);
                    yield this.delay(15555);
                }
            }
            const doc = reportXml.CxXMLResults;
            result.scanStart = doc.$.ScanStart;
            result.scanTime = doc.$.ScanTime;
            result.locScanned = doc.$.LinesOfCodeScanned;
            result.filesScanned = doc.$.FilesScanned;
            result.queryList = CxClient.toJsonQueries(doc.Query);
            // TODO: PowerShell code also adds properties such as newHighCount, but they are not used in the UI.
        });
    }
    printStatistics(result) {
        this.log.info(`----------------------------Checkmarx Scan Results(CxSAST):-------------------------------
High severity results: ${result.highResults}
Medium severity results: ${result.mediumResults}
Low severity results: ${result.lowResults}
Info severity results: ${result.infoResults}

Scan results location:  ${result.sastScanResultsLink}
------------------------------------------------------------------------------------------
`);
    }
    static toJsonQueries(queries) {
        const SEPARATOR = ';';
        // queries can be undefined if no vulnerabilities were found.
        return (queries || []).map(query => JSON.stringify({
            name: query.$.name,
            severity: query.$.Severity,
            resultLength: query.Result.length
        })).join(SEPARATOR);
    }
    getVersionInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            let versionInfo = null;
            try {
                versionInfo = yield this.httpClient.getRequest('system/version', { suppressWarnings: true });
                this.log.info(`Checkmarx server version [${versionInfo.version}]. Hotfix [${versionInfo.hotFix}].`);
            }
            catch (e) {
                versionInfo = null;
                this.log.info('Checkmarx server version is lower than 9.0.');
            }
            return versionInfo;
        });
    }
    initDynamicFields() {
        return __awaiter(this, void 0, void 0, function* () {
            const versionInfo = yield this.getVersionInfo();
            this.isPolicyEnforcementSupported = !!versionInfo;
            this.presetId = yield this.sastClient.getPresetIdByName(this.config.presetName);
            const teamApiClient = new teamApiClient_1.TeamApiClient(this.httpClient, this.log);
            this.teamId = yield teamApiClient.getTeamIdByName(this.config.teamName);
            this.projectId = yield this.getOrCreateProject();
        });
    }
    logBuildFailure(failure) {
        this.log.error(`********************************************
The Build Failed for the Following Reasons:
********************************************`);
        this.logPolicyCheckError(failure.policyCheck);
        this.logThresholdErrors(failure.thresholdErrors);
    }
    logPolicyCheckSummary(policyCheck) {
        if (policyCheck.wasPerformed) {
            this.log.info(`-----------------------------------------------------------------------------------------
Policy Management:
--------------------`);
            if (policyCheck.violatedPolicyNames.length) {
                this.log.info('Project policy status: violated');
                const names = policyCheck.violatedPolicyNames.join(', ');
                this.log.info(`SAST violated policies names: ${names}`);
            }
            else {
                this.log.info('Project policy status: compliant');
            }
            this.log.info('-----------------------------------------------------------------------------------------');
        }
    }
    logThresholdErrors(thresholdErrors) {
        if (thresholdErrors.length) {
            this.log.error('Exceeded CxSAST Vulnerability Threshold.');
            for (const error of thresholdErrors) {
                this.log.error(`SAST ${error.severity} severity results are above threshold. Results: ${error.actualViolationCount}. Threshold: ${error.threshold}`);
            }
        }
    }
    logPolicyCheckError(policyCheck) {
        if (policyCheck.violatedPolicyNames.length) {
            this.log.error('Project policy status: violated');
        }
    }
}
exports.CxClient = CxClient;
//# sourceMappingURL=cxClient.js.map