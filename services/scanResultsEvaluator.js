"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Determines if the current build has failed, using provided scan results and configuration.
 * Logs the reasons why the build has failed, if any.
 */
class ScanResultsEvaluator {
    constructor(scanResults, config, log, isPolicyEnforcementSupported) {
        this.scanResults = scanResults;
        this.config = config;
        this.log = log;
        this.isPolicyEnforcementSupported = isPolicyEnforcementSupported;
    }
    evaluate() {
        this.checkForPolicyViolations();
        this.checkForExceededThresholds();
    }
    checkForPolicyViolations() {
        if (!this.config.enablePolicyViolations || !this.isPolicyEnforcementSupported) {
            return;
        }
        this.log.info(`-----------------------------------------------------------------------------------------
Policy Management:
--------------------`);
        if (!this.scanResults.sastPolicies.length) {
            this.log.info('Project policy status: compliant');
        }
        else {
            this.log.info('Project policy status: violated');
            const names = this.scanResults.sastPolicies.join(', ');
            this.log.info(`SAST violated policies names: ${names}`);
        }
        this.log.info('-----------------------------------------------------------------------------------------');
        if (this.scanResults.policyViolated) {
            this.logBuildFailure('Project policy status: violated');
        }
    }
    checkForExceededThresholds() {
        if (this.config.vulnerabilityThreshold && this.checkIfSastThresholdExceeded()) {
            this.logBuildFailure('Exceeded CxSAST Vulnerability Threshold.');
        }
    }
    checkIfSastThresholdExceeded() {
        const highExceeded = this.isLevelThresholdExceeded(this.scanResults.highResults, this.scanResults.highThreshold, 'high');
        const mediumExceeded = this.isLevelThresholdExceeded(this.scanResults.mediumResults, this.scanResults.mediumThreshold, 'medium');
        const lowExceeded = this.isLevelThresholdExceeded(this.scanResults.lowResults, this.scanResults.lowThreshold, 'low');
        return highExceeded || mediumExceeded || lowExceeded;
    }
    isLevelThresholdExceeded(amountToCheck, threshold, severity) {
        let result = false;
        if (typeof threshold !== 'undefined') {
            if (threshold <= 0) {
                throw Error('Threshold must be 0 or greater');
            }
            if (amountToCheck > threshold) {
                this.logBuildFailure(`SAST ${severity} severity results are above threshold. Results: ${amountToCheck}. Threshold: ${threshold}`);
                result = true;
            }
        }
        return result;
    }
    logBuildFailure(reason) {
        if (!this.scanResults.buildFailed) {
            this.log.error(`********************************************
The Build Failed for the Following Reasons:
********************************************`);
            this.scanResults.buildFailed = true;
        }
        this.log.error(reason);
    }
}
exports.ScanResultsEvaluator = ScanResultsEvaluator;
//# sourceMappingURL=scanResultsEvaluator.js.map