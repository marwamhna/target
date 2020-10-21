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
Object.defineProperty(exports, "__esModule", { value: true });
class TeamApiClient {
    constructor(httpClient, log) {
        this.httpClient = httpClient;
        this.log = log;
    }
    getTeamIdByName(teamName) {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.info(`Resolving team: ${teamName}`);
            const allTeams = yield this.httpClient.getRequest('auth/teams');
            const foundTeam = allTeams.find(team => TeamApiClient.normalizeTeamName(team.fullName) === teamName);
            if (foundTeam) {
                this.log.debug(`Resolved team ID: ${foundTeam.id}`);
                return foundTeam.id;
            }
            else {
                throw Error(`Could not resolve team ID from team name: ${teamName}`);
            }
        });
    }
    /*
        Transforms backslashes to forward slashes.
        Replaces groups of consecutive slashes with a single slash.
        Adds a leading slash if not present.
     */
    static normalizeTeamName(input) {
        const STANDARD_SEPARATOR = '/';
        let result = input || '';
        while (result.includes('\\') || result.includes('//')) {
            result = result
                .replace('\\', STANDARD_SEPARATOR)
                .replace('//', STANDARD_SEPARATOR);
        }
        if (!result.startsWith(STANDARD_SEPARATOR)) {
            result = STANDARD_SEPARATOR + result;
        }
        return result;
    }
}
exports.TeamApiClient = TeamApiClient;
//# sourceMappingURL=teamApiClient.js.map