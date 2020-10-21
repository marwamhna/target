"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const filePathFilter_1 = require("../services/filePathFilter");
const assert = __importStar(require("assert"));
class Utils {
    static verifyFilterPattern(filterPattern, testCases) {
        Utils.verifyTestCases(testCases, filterPattern, '');
    }
    static verifyExcludedFolders(excludedFolders, testCases) {
        Utils.verifyTestCases(testCases, '', excludedFolders);
    }
    static verifyTestCases(testCases, filterPattern, excludedFolders) {
        const filter = new filePathFilter_1.FilePathFilter(filterPattern, excludedFolders);
        testCases.forEach(pathTestCase => {
            const path = pathTestCase[0];
            const shouldBeIncluded = pathTestCase[1];
            const assertion = shouldBeIncluded ? 'included' : 'excluded';
            const byWhat = filterPattern ? 'filter pattern' : 'excludedFolders';
            const paramToShow = filterPattern || excludedFolders;
            assert.equal(filter.includes(path), shouldBeIncluded, `'${path}' should be ${assertion} by ${byWhat}: '${paramToShow}'`);
        });
    }
}
exports.Utils = Utils;
//# sourceMappingURL=utils.js.map