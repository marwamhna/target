"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scanSummary_1 = require("../dto/scanSummary");
class ScanSummaryEvaluator {
    constructor(config, log, isPolicyEnforcementSupported) {
        this.config = config;
        this.log = log;
        this.isPolicyEnforcementSupported = isPolicyEnforcementSupported;
    }
    /**
     * Generates scan summary with error info, if any.
     */
    getScanSummary(scanResult) {
        const result = new scanSummary_1.ScanSummary();
        result.policyCheck = this.getPolicyCheckSummary(scanResult);
        result.thresholdErrors = this.getThresholdErrors(scanResult);
        return result;
    }
    getPolicyCheckSummary(scanResult) {
        let result;
        if (this.config.enablePolicyViolations && this.isPolicyEnforcementSupported) {
            result = {
                wasPerformed: true,
                violatedPolicyNames: scanResult.sastPolicies
            };
        }
        else {
            result = {
                wasPerformed: false,
                violatedPolicyNames: []
            };
        }
        return result;
    }
    getThresholdErrors(scanResult) {
        let result;
        if (this.config.vulnerabilityThreshold) {
            result = this.getSastThresholdErrors(scanResult);
        }
        else {
            result = [];
        }
        return result;
    }
    getSastThresholdErrors(scanResult) {
        const result = [];
        ScanSummaryEvaluator.addThresholdErrors(scanResult.highResults, this.config.highThreshold, 'high', result);
        ScanSummaryEvaluator.addThresholdErrors(scanResult.mediumResults, this.config.mediumThreshold, 'medium', result);
        ScanSummaryEvaluator.addThresholdErrors(scanResult.lowResults, this.config.lowThreshold, 'low', result);
        return result;
    }
    static addThresholdErrors(amountToCheck, threshold, severity, target) {
        if (typeof threshold !== 'undefined') {
            if (threshold < 0) {
                throw Error('Threshold must be 0 or greater');
            }
            if (amountToCheck > threshold) {
                target.push({
                    severity,
                    actualViolationCount: amountToCheck,
                    threshold
                });
            }
        }
    }
}
exports.ScanSummaryEvaluator = ScanSummaryEvaluator;
//# sourceMappingURL=scanSummaryEvaluator.js.map