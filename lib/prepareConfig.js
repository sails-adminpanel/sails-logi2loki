"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customLogger = void 0;
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, colorize, label, printf, align } = format;
const { SPLAT } = require('triple-beam');
const { isObject } = require('lodash');
function formatObject(param) {
    if (isObject(param)) {
        return JSON.stringify(param);
    }
    return param;
}
const LokiTransport = require("winston-loki");
// Function to format labels
function formatLabel(labelName, value) {
    const camelCaseLabelName = labelName.toLowerCase().replace(/_(\w)/g, (_, match) => match.toUpperCase());
    return { [camelCaseLabelName]: value };
}
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const hostname = os.hostname();
const cwd = process.cwd();
const cwdHash = crypto.createHash('sha256').update(cwd).digest('hex');
const last7Chars = cwdHash.substr(-7);
const fs = require('fs');
// Check if package.json exists
let basename;
try {
    const packageJson = fs.readFileSync('./package.json');
    const packageData = JSON.parse(packageJson);
    basename = packageData.name;
}
catch (error) {
    // If package.json doesn't exist or couldn't be read, use the base name of cwd
    basename = path.basename(cwd);
}
// Set default value for LOKI_LABEL_APP_NAME if not provided
const defaultAppName = process.env.APP_NAME ?? process.env.PROJECT_NAME ?? `${hostname}_${basename}_${last7Chars}`;
process.env.LOKI_LABEL_APP_NAME = process.env.LOKI_LABEL_APP_NAME || defaultAppName;
const env_labels = Object.entries(process.env)
    .filter(([key]) => key.startsWith("LOKI_LABEL_"))
    .map(([key, value]) => formatLabel(key.substring(11), value));
/**
 * To add Loki labels, set the environment variable in the format LOKI_LABEL_NAME_LABEL=Value.
 * It will be converted to CamelCase format and used as a label for this Sails instance.
 *
 * If LOKI_LABEL_APP_NAME is not explicitly set, it will be set by default in the following format:
 * AppName=`${hostname}_${basename_of_cwd}_${last_7_digits_of_sha256hash_cwd_path}`
 */
const labels = {
    NODE_ENV: process.env.NODE_ENV,
    ...Object.assign({}, ...env_labels) // Merge all label objects into one
};
const headers = {};
if (process.env.LOKI_ORG_ID) {
    headers['X-Scope-OrgID'] = process.env.LOKI_ORG_ID;
}
const _loki = new LokiTransport({
    batching: true,
    interval: 5,
    labels: labels,
    ...process.env.LOKI_CONFIG_BASIC_AUTH && { basicAuth: process.env.LOKI_CONFIG_BASIC_AUTH },
    // json: process.env.LOKI_CONFIG_JSON ? true : false,
    // replaceTimestamp: true,
    // format: process.env.LOKI_CONFIG_JSON ? format.json() : undefined,
    host: process.env.LOKI_CONFIG_HOST,
    ...Object.keys(headers).length > 0 && { headers: headers }
});
console.debug(`new loki instance initialize`, process.env.LOKI_LABEL_APP_NAME, `level: ${sails.config.log.level}`);
console.debug(`loki: labels:`, labels);
const all = format((info) => {
    const splat = info[SPLAT] || [];
    const message = formatObject(info.message);
    const rest = splat.map(formatObject).join(' ');
    info.message = `${message} ${rest}`;
    return info;
});
exports.customLogger = createLogger({
    //@ts-ignore
    level: sails.config.log.level,
    // format: format.json(),
    // levels: config.syslog.levels,
    transports: [
        _loki,
        new transports.Console({
            format: combine(all(), label({ label: "version" }), timestamp(), colorize(), align(), printf(info => `${formatObject(info.message)}`))
        })
    ],
});
