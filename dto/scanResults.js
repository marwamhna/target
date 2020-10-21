"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Most OSA-related fields are currently not in use.
 * They are kept here to avoid changes in HTML report generation and also for possible reuse in other plugins.
 */
class ScanResults {
    constructor(config) {
        this.buildFailed = false;
        this.errorOccurred = false;
        this.osaEnabled = false;
        this.osaThresholdExceeded = false;
        this.sastThresholdExceeded = false;
        this.sastResultsReady = false;
        this.scanId = 0;
        this.osaFailed = false;
        this.osaScanId = null;
        this.osaProjectSummaryLink = null;
        this.osaThresholdEnabled = false;
        this.osaHighThreshold = 0;
        this.osaMediumThreshold = 0;
        this.osaLowThreshold = 0;
        this.sastViolations = [];
        this.sastPolicies = [];
        this.osaViolations = [];
        this.osaPolicies = [];
        this.highResults = 0;
        this.mediumResults = 0;
        this.lowResults = 0;
        this.infoResults = 0;
        this.sastScanResultsLink = '';
        this.sastSummaryResultsLink = '';
        this.scanStart = ''; // E.g. "Sunday, October 27, 2019 1:58:48 PM"
        this.scanTime = ''; // E.g. "00h:03m:25s"
        this.locScanned = 0;
        this.filesScanned = 0;
        // TODO: check if this is needed anywhere.
        // riskLevel = null;
        // projectId = 0;
        // newHighCount = 0;
        // newMediumCount = 0;
        // newLowCount = 0;
        // newInfoCount = 0;
        this.queryList = '';
        this.osaStartTime = ''; // E.g. "2019-10-27T12:22:50.223"
        this.osaEndTime = '';
        this.osaHighResults = 0;
        this.osaMediumResults = 0;
        this.osaLowResults = 0;
        this.osaSummaryResultsLink = '';
        this.osaVulnerableLibraries = 0;
        this.osaOkLibraries = 0;
        this.url = config.serverUrl;
        this.syncMode = config.isSyncMode;
        this.enablePolicyViolations = config.enablePolicyViolations;
        this.thresholdEnabled = config.vulnerabilityThreshold;
        this.highThreshold = config.highThreshold;
        this.mediumThreshold = config.mediumThreshold;
        this.lowThreshold = config.lowThreshold;
    }
}
exports.ScanResults = ScanResults;
//# sourceMappingURL=scanResults.js.map