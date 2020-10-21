"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const micromatch = __importStar(require("micromatch"));
// Allows to include/exclude files based on a filter pattern.
// The behavior is intended to be as close as possible to the Common Client. Therefore the behavior is different
// from the previous (PowerShell) versions of this plugin.
// E.g. where PowerShell plugin uses `*.java`, the current plugin should use `**/*.java`
class FilePathFilter {
    constructor(filterPattern, excludedFolders) {
        this.PATTERN_SEPARATOR = ',';
        this.EXCLUSION_INDICATOR = '!';
        this.include = [];
        this.exclude = [];
        this.parseFilterPattern(filterPattern);
        this.parseExcludedFolders(excludedFolders);
    }
    /**
     * Indicates if a given path passes through the current filter.
     */
    includes(path) {
        const matchesAnyInclusionPattern = micromatch.any(path, this.include, FilePathFilter.fileMatcherOptions);
        const matchesAnyExclusionPattern = micromatch.any(path, this.exclude, FilePathFilter.fileMatcherOptions);
        return matchesAnyInclusionPattern && !matchesAnyExclusionPattern;
    }
    parseFilterPattern(filterPattern) {
        // Distribute the patterns from the input string into inclusion or exclusion arrays.
        filterPattern.split(this.PATTERN_SEPARATOR)
            .map(pattern => pattern.trim())
            .forEach(pattern => {
            if (pattern.startsWith(this.EXCLUSION_INDICATOR)) {
                const excluded = pattern.substring(this.EXCLUSION_INDICATOR.length).trim();
                if (excluded.length) {
                    this.exclude.push(excluded);
                }
            }
            else if (pattern.length) {
                this.include.push(pattern);
            }
        });
        // If there are no including patterns, assume that we want to include all files by default.
        if (!this.include.length) {
            const INCLUDE_ALL = '**';
            // Otherwise no files will be included at all.
            this.include.push(INCLUDE_ALL);
        }
    }
    parseExcludedFolders(excludedFolders) {
        const foldersAsFilterPatterns = excludedFolders.split(this.PATTERN_SEPARATOR)
            .map(pattern => pattern.trim())
            .filter(pattern => pattern)
            // The folder should be excluded when found at any depth.
            .map(pattern => `**/${pattern}/**`);
        this.exclude.push(...foldersAsFilterPatterns);
    }
}
exports.FilePathFilter = FilePathFilter;
FilePathFilter.fileMatcherOptions = {
    dot: true,
    nonegate: true,
    // Disable extended functionality that we don't expect in a pattern.
    nobrace: true,
    noext: true
};
//# sourceMappingURL=filePathFilter.js.map