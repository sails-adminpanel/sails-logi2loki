"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const afterHook_1 = require("./afterHook");
const prepareConfig_1 = require("./prepareConfig");
function ToInitialize(sails) {
    if (process.env.LOKI_CONFIG_HOST !== undefined) {
        sails.config.log.custom = prepareConfig_1.customLogger;
    }
    return async function initialize(cb) {
        (0, afterHook_1.default)();
        cb();
    };
}
exports.default = ToInitialize;
