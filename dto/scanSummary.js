"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ScanSummary {
    constructor() {
        this.policyCheck = { wasPerformed: false, violatedPolicyNames: [] };
        this.thresholdErrors = [];
        this.hasErrors = () => !!(this.policyCheck.violatedPolicyNames.length || this.thresholdErrors.length);
    }
}
exports.ScanSummary = ScanSummary;
//# sourceMappingURL=scanSummary.js.map