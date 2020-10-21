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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const url = __importStar(require("url"));
const request = __importStar(require("superagent"));
/**
 * Implements low-level API request logic.
 */
class HttpClient {
    constructor(baseUrl, log) {
        this.baseUrl = baseUrl;
        this.log = log;
        this.accessToken = '';
        this.username = '';
        this.password = '';
    }
    login(username, password) {
        this.log.info('Logging into the Checkmarx service.');
        this.username = username;
        this.password = password;
        return this.loginWithStoredCredentials();
    }
    getRequest(relativePath, options) {
        return this.sendRequest(relativePath, Object.assign({ retry: true }, options));
    }
    postRequest(relativePath, data) {
        return this.sendRequest(relativePath, { singlePostData: data, retry: true });
    }
    postMultipartRequest(relativePath, fields, attachments) {
        return this.sendRequest(relativePath, {
            multipartPostData: {
                fields,
                attachments
            },
            retry: true
        });
    }
    sendRequest(relativePath, options) {
        const effectiveBaseUrl = options.baseUrlOverride || this.baseUrl;
        const fullUrl = url.resolve(effectiveBaseUrl, relativePath);
        const method = options.singlePostData || options.multipartPostData ? 'post' : 'get';
        this.log.debug(`Sending ${method.toUpperCase()} request to ${fullUrl}`);
        let result = request[method](fullUrl)
            .auth(this.accessToken, { type: 'bearer' })
            .accept('json');
        result = HttpClient.includePostData(result, options);
        return result.then((response) => {
            return response.body;
        }, (err) => __awaiter(this, void 0, void 0, function* () {
            const canRetry = options.retry && err && err.response && err.response.unauthorized;
            if (canRetry) {
                this.log.warning('Access token expired, requesting a new token');
                yield this.loginWithStoredCredentials();
                const optionsClone = Object.assign({}, options);
                // Avoid infinite recursion.
                optionsClone.retry = false;
                return this.sendRequest(relativePath, optionsClone);
            }
            else {
                const message = `${method.toUpperCase()} request failed to ${fullUrl}`;
                const logMethod = options.suppressWarnings ? 'debug' : 'warning';
                this.log[logMethod](message);
                return Promise.reject(err);
            }
        }));
    }
    static includePostData(result, options) {
        if (options.singlePostData) {
            result = result.send(options.singlePostData);
        }
        else if (options.multipartPostData) {
            const { fields, attachments } = options.multipartPostData;
            result = result.field(fields);
            for (const prop in attachments) {
                result = result.attach(prop, attachments[prop]);
            }
        }
        return result;
    }
    loginWithStoredCredentials() {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        const fullUrl = url.resolve(this.baseUrl, 'auth/identity/connect/token');
        return request
            .post(fullUrl)
            .type('form')
            .send({
            userName: this.username,
            password: this.password,
            grant_type: 'password',
            scope: 'sast_rest_api',
            client_id: 'resource_owner_client',
            client_secret: '014DF517-39D1-4453-B7B3-9930C563627C'
        })
            .then((response) => {
            this.accessToken = response.body.access_token;
        }, (err) => {
            const status = err && err.response ? err.response.status : 'n/a';
            const message = err && err.message ? err.message : 'n/a';
            this.log.error(`POST request failed to ${fullUrl}. HTTP status: ${status}, message: ${message}`);
            throw Error('Login failed');
        });
    }
}
exports.HttpClient = HttpClient;
//# sourceMappingURL=httpClient.js.map