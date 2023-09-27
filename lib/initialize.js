"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const afterHook_1 = require("./afterHook");
function ToInitialize(sails) {
    if (process.env.LOKI_CONFIG_HOST !== undefined) {
        const prepareConfig = require("./prepareConfig");
        sails.config.log.custom = prepareConfig.customLogger;
    }
    return async function initialize(cb) {
        (0, afterHook_1.default)();
        cb();
    };
}
exports.default = ToInitialize;
