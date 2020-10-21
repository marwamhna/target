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
const taskLib = require("azure-pipelines-task-lib/task");
const consoleLogger_1 = require("./consoleLogger");
const configReader_1 = require("./configReader");
const cxClient_1 = require("./clients/cxClient");
const taskSkippedError_1 = require("../dto/taskSkippedError");
const fileUtil_1 = require("./fileUtil");
const fs = __importStar(require("fs"));
class TaskRunner {
    constructor() {
        this.log = new consoleLogger_1.ConsoleLogger();
    }
    /*
     To run this task in console, task inputs must be provided in environment variables.
     The names of the environment variables use prefixes and must look like this:
         INPUT_CheckmarxService=myendpoint123
         ENDPOINT_URL_myendpoint123=http://example.com
         ENDPOINT_AUTH_PARAMETER_myendpoint123_USERNAME=myusername
         ENDPOINT_AUTH_PARAMETER_myendpoint123_PASSWORD=mypassword
         ENDPOINT_AUTH_SCHEME_myendpoint123=UsernamePassword
         BUILD_SOURCESDIRECTORY=c:\projectsToScan\MyProject
         INPUT_PROJECTNAME=VstsTest1
         INPUT_FULLTEAMNAME=\CxServer
         ...
    */
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.printHeader();
                this.log.info('Entering CxScanner...');
                const reader = new configReader_1.ConfigReader(this.log);
                const config = reader.readConfig();
                const cxClient = new cxClient_1.CxClient(this.log);
                const scanResults = yield cxClient.scan(config);
                yield this.attachJsonReport(scanResults);
                if (scanResults.buildFailed) {
                    taskLib.setResult(taskLib.TaskResult.Failed, 'Build failed');
                }
            }
            catch (err) {
                if (err instanceof taskSkippedError_1.TaskSkippedError) {
                    taskLib.setResult(taskLib.TaskResult.Skipped, err.message);
                }
                else if (err instanceof Error) {
                    this.log.error(`Scan cannot be completed. ${err.stack}`);
                    taskLib.setResult(taskLib.TaskResult.Failed, `Scan cannot be completed. ${err.message}`);
                }
                else {
                    taskLib.setResult(taskLib.TaskResult.Failed, `Scan cannot be completed. ${err}`);
                }
            }
        });
    }
    attachJsonReport(scanResults) {
        return __awaiter(this, void 0, void 0, function* () {
            const jsonReportPath = fileUtil_1.FileUtil.generateTempFileName({ prefix: 'cxreport-', postfix: '.json' });
            const reportJson = JSON.stringify(scanResults);
            this.log.debug(`Writing report to ${jsonReportPath}`);
            yield new Promise((resolve, reject) => {
                fs.writeFile(jsonReportPath, reportJson, err => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
            taskLib.addAttachment(TaskRunner.REPORT_ATTACHMENT_NAME, TaskRunner.REPORT_ATTACHMENT_NAME, jsonReportPath);
            this.log.info('Generated Checkmarx summary results.');
        });
    }
    printHeader() {
        this.log.info(`
         CxCxCxCxCxCxCxCxCxCxCxCx          
        CxCxCxCxCxCxCxCxCxCxCxCxCx         
       CxCxCxCxCxCxCxCxCxCxCxCxCxCx        
      CxCxCx                CxCxCxCx       
      CxCxCx                CxCxCxCx       
      CxCxCx  CxCxCx      CxCxCxCxC        
      CxCxCx  xCxCxCx  .CxCxCxCxCx         
      CxCxCx   xCxCxCxCxCxCxCxCx           
      CxCxCx    xCxCxCxCxCxCx              
      CxCxCx     CxCxCxCxCx   CxCxCx       
      CxCxCx       xCxCxC     CxCxCx       
      CxCxCx                 CxCxCx        
       CxCxCxCxCxCxCxCxCxCxCxCxCxCx        
        CxCxCxCxCxCxCxCxCxCxCxCxCx         
          CxCxCxCxCxCxCxCxCxCxCx           
                                           
            C H E C K M A R X              
                                           
Starting Checkmarx scan`);
    }
}
exports.TaskRunner = TaskRunner;
TaskRunner.REPORT_ATTACHMENT_NAME = 'cxReport';
//# sourceMappingURL=taskRunner.js.map