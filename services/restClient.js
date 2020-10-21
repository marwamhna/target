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
const zipper_1 = __importDefault(require("./zipper"));
const taskSkippedError_1 = require("../dto/taskSkippedError");
const scanResults_1 = require("../dto/scanResults");
const sastClient_1 = require("./sastClient");
const url = __importStar(require("url"));
const armClient_1 = require("./armClient");
const reportingClient_1 = require("./reportingClient");
const scanResultsEvaluator_1 = require("./scanResultsEvaluator");
const filePathFilter_1 = require("./filePathFilter");
const fileUtil_1 = require("./fileUtil");
const teamApiClient_1 = require("./teamApiClient");
/**
 * High-level CX API client that uses specialized clients internally.
 */
class RestClient {
    constructor(config, log) {
        this.config = config;
        this.log = log;
        this.teamId = 0;
        this.projectId = 0;
        this.presetId = 0;
        this.isPolicyEnforcementSupported = false;
        const baseUrl = url.resolve(this.config.serverUrl, 'CxRestAPI/');
        this.httpClient = new httpClient_1.HttpClient(baseUrl, log);
        this.sastClient = new sastClient_1.SastClient(this.config, this.httpClient, log);
        this.armClient = new armClient_1.ArmClient(this.httpClient, log);
        this.scanResults = new scanResults_1.ScanResults(this.config);
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.info('Initializing Cx client');
            yield this.detectFeatureSupport();
            yield this.httpClient.login(this.config.username, this.config.password);
            this.presetId = yield this.sastClient.getPresetIdByName(this.config.presetName);
            if (this.config.enablePolicyViolations) {
                yield this.armClient.init();
            }
            const teamApiClient = new teamApiClient_1.TeamApiClient(this.httpClient, this.log);
            this.teamId = yield teamApiClient.getTeamIdByName(this.config.teamName);
            yield this.resolveProject();
        });
    }
    createSASTScan() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.info('-----------------------------------Create CxSAST Scan:-----------------------------------');
            yield this.defineScanSettings();
            yield this.uploadSourceCode();
            this.scanResults.scanId = yield this.sastClient.createScan(this.projectId);
            const projectStateUrl = url.resolve(this.config.serverUrl, `CxWebClient/portal#/projectState/${this.projectId}/Summary`);
            this.log.info(`SAST scan created successfully. CxLink to project state: ${projectStateUrl}`);
        });
    }
    getSASTResults() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.info('------------------------------------Get CxSAST Results:----------------------------------');
            this.log.info('Retrieving SAST scan results');
            yield this.sastClient.waitForScanToFinish();
            yield this.addStatisticsToScanResults();
            yield this.addPolicyViolationsToScanResults();
            this.printStatistics();
            yield this.addDetailedReportToScanResults();
            const evaluator = new scanResultsEvaluator_1.ScanResultsEvaluator(this.scanResults, this.config, this.log, this.isPolicyEnforcementSupported);
            evaluator.evaluate();
        });
    }
    resolveProject() {
        return __awaiter(this, void 0, void 0, function* () {
            this.projectId = yield this.getCurrentProjectId();
            if (this.projectId) {
                this.log.debug(`Resolved project ID: ${this.projectId}`);
            }
            else {
                this.log.info('Project not found, creating a new one.');
                if (this.config.denyProject) {
                    throw Error(`Creation of the new project [${this.config.projectName}] is not authorized. Please use an existing project.` +
                        " You can enable the creation of new projects by disabling the Deny new Checkmarx projects creation checkbox in the Checkmarx plugin global settings.");
                }
                this.projectId = yield this.createNewProject();
            }
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
    defineScanSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            const settingsResponse = yield this.sastClient.getScanSettings(this.projectId);
            const engineConfigurationId = this.config.engineConfigurationId || settingsResponse.engineConfiguration.id;
            const request = {
                projectId: this.projectId,
                presetId: this.presetId,
                engineConfigurationId,
                emailNotifications: settingsResponse.emailNotifications
            };
            // TODO: PowerShell code uses postScanActionId = settingsResponse.postScanAction    - is this correct?
            if (settingsResponse.postScanAction) {
                request.postScanActionId = settingsResponse.postScanAction.id;
            }
            yield this.sastClient.updateScanSettings(request);
        });
    }
    addPolicyViolationsToScanResults() {
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
                this.scanResults.sastPolicies.push(policy.policyName);
                for (const violation of policy.violations) {
                    this.scanResults.sastViolations.push({
                        libraryName: violation.source,
                        policyName: policy.policyName,
                        ruleName: violation.ruleName,
                        detectionDate: (new Date(violation.firstDetectionDateByArm)).toLocaleDateString()
                    });
                }
            }
            if (this.scanResults.sastViolations.length) {
                this.scanResults.policyViolated = true;
            }
        });
    }
    addStatisticsToScanResults() {
        return __awaiter(this, void 0, void 0, function* () {
            const statistics = yield this.sastClient.getScanStatistics(this.scanResults.scanId);
            this.scanResults.highResults = statistics.highSeverity;
            this.scanResults.mediumResults = statistics.mediumSeverity;
            this.scanResults.lowResults = statistics.lowSeverity;
            this.scanResults.infoResults = statistics.infoSeverity;
            const sastScanPath = `CxWebClient/ViewerMain.aspx?scanId=${this.scanResults.scanId}&ProjectID=${this.projectId}`;
            this.scanResults.sastScanResultsLink = url.resolve(this.config.serverUrl, sastScanPath);
            const sastProjectLink = `CxWebClient/portal#/projectState/${this.projectId}/Summary`;
            this.scanResults.sastSummaryResultsLink = url.resolve(this.config.serverUrl, sastProjectLink);
            this.scanResults.sastResultsReady = true;
        });
    }
    addDetailedReportToScanResults() {
        return __awaiter(this, void 0, void 0, function* () {
            const client = new reportingClient_1.ReportingClient(this.httpClient, this.log);
            const reportXml = yield client.generateReport(this.scanResults.scanId);
            const doc = reportXml.CxXMLResults;
            this.scanResults.scanStart = doc.$.ScanStart;
            this.scanResults.scanTime = doc.$.ScanTime;
            this.scanResults.locScanned = doc.$.LinesOfCodeScanned;
            this.scanResults.filesScanned = doc.$.FilesScanned;
            this.scanResults.queryList = RestClient.toJsonQueries(doc.Query);
            // TODO: PowerShell code also adds properties such as newHighCount, but they are not used in the UI.
        });
    }
    printStatistics() {
        this.log.info(`----------------------------Checkmarx Scan Results(CxSAST):-------------------------------
High severity results: ${this.scanResults.highResults}
Medium severity results: ${this.scanResults.mediumResults}
Low severity results: ${this.scanResults.lowResults}
Info severity results: ${this.scanResults.infoResults}

Scan results location:  ${this.scanResults.sastScanResultsLink}
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
    detectFeatureSupport() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const versionInfo = yield this.httpClient.getRequest('system/version', { suppressWarnings: true });
                this.log.info(`Checkmarx server version [${versionInfo.version}]. Hotfix [${versionInfo.hotFix}].`);
                this.isPolicyEnforcementSupported = true;
            }
            catch (e) {
                this.log.info('Checkmarx server version is lower than 9.0.');
                this.isPolicyEnforcementSupported = false;
            }
        });
    }
}
exports.RestClient = RestClient;
//# sourceMappingURL=restClient.js.map