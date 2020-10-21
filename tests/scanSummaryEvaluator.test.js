"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const scanSummaryEvaluator_1 = require("../services/scanSummaryEvaluator");
const scanResults_1 = require("../dto/scanResults");
const assert = __importStar(require("assert"));
describe("ScanSummaryEvaluator", function () {
    it('should return violated policy names in summary', function () {
        const config = getScanConfig();
        config.enablePolicyViolations = true;
        const target = new scanSummaryEvaluator_1.ScanSummaryEvaluator(config, getDummyLogger(), true);
        const scanResults = new scanResults_1.ScanResults(config);
        scanResults.sastPolicies = ['policy1', 'policy2'];
        const summary = target.getScanSummary(scanResults);
        assert.ok(summary);
        assert.ok(summary.hasErrors());
        assert.ok(summary.policyCheck);
        assert.ok(summary.policyCheck.wasPerformed);
        assert.deepStrictEqual(summary.policyCheck.violatedPolicyNames, scanResults.sastPolicies);
    });
    it('should return threshold errors in summary', function () {
        const config = getScanConfig();
        config.highThreshold = 1;
        config.mediumThreshold = 5;
        config.lowThreshold = 10;
        config.vulnerabilityThreshold = true;
        const target = new scanSummaryEvaluator_1.ScanSummaryEvaluator(config, getDummyLogger(), false);
        const scanResults = new scanResults_1.ScanResults(config);
        scanResults.highResults = 3;
        scanResults.mediumResults = 8;
        scanResults.lowResults = 4;
        const summary = target.getScanSummary(scanResults);
        assert.ok(summary.hasErrors());
        assert.equal(summary.thresholdErrors.length, 2);
    });
    it('should not return threshold errors if all values are below thresholds', function () {
        const config = getScanConfig();
        config.highThreshold = 10;
        config.mediumThreshold = 15;
        config.lowThreshold = 20;
        config.vulnerabilityThreshold = true;
        const target = new scanSummaryEvaluator_1.ScanSummaryEvaluator(config, getDummyLogger(), false);
        const scanResults = new scanResults_1.ScanResults(config);
        scanResults.highResults = 2;
        scanResults.mediumResults = 11;
        scanResults.lowResults = 18;
        const summary = target.getScanSummary(scanResults);
        assert.ok(!summary.hasErrors());
        assert.equal(summary.thresholdErrors.length, 0);
    });
});
function getScanConfig() {
    return {
        comment: "",
        denyProject: false,
        enablePolicyViolations: false,
        fileExtension: "",
        folderExclusion: "",
        forceScan: false,
        isIncremental: false,
        isPublic: false,
        isSyncMode: false,
        password: "",
        presetName: "",
        projectName: "",
        serverUrl: "",
        sourceLocation: "",
        teamName: "",
        username: "",
        vulnerabilityThreshold: false
    };
}
function getDummyLogger() {
    return {
        debug() {
        },
        error() {
        },
        info() {
        },
        warning() {
        }
    };
}
//# sourceMappingURL=scanSummaryEvaluator.test.js.map