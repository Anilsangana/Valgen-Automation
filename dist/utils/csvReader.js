"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCsvFile = parseCsvFile;
const fs_1 = __importDefault(require("fs"));
const papaparse_1 = __importDefault(require("papaparse"));
function parseCsvFile(filePath) {
    return new Promise((resolve, reject) => {
        const input = fs_1.default.createReadStream(filePath);
        papaparse_1.default.parse(input, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (err) => reject(err)
        });
    });
}
