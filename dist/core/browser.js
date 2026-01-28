"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.automationEvents = void 0;
exports.launchBrowser = launchBrowser;
exports.newPage = newPage;
const playwright_1 = require("playwright");
const events_1 = __importDefault(require("events"));
const fs_1 = __importDefault(require("fs"));
async function launchBrowser(options = {}) {
    const { storageState, ...launchOptions } = options;
    const browser = await playwright_1.chromium.launch({
        headless: launchOptions.headless ?? false,
        ...launchOptions,
    });
    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        storageState: storageState && fs_1.default.existsSync(storageState)
            ? storageState
            : undefined,
    });
    return { browser, context };
}
async function newPage(context) {
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(60000);
    return page;
}
exports.automationEvents = new events_1.default();
