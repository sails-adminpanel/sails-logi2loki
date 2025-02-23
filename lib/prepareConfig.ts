const { createLogger, format, transports } = require('winston');
const { combine, timestamp, colorize, label, printf, align } = format;
const { SPLAT } = require('triple-beam');
const { isObject } = require('lodash');
const LokiTransport = require("winston-loki");
const axios = require('axios');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
import Transport = require('winston-transport');

function formatObject(param) {
  return isObject(param) ? JSON.stringify(param) : param;
}

// Function to format labels
function formatLabel(labelName, value) {
  const camelCaseLabelName = labelName.toLowerCase().replace(/_(\w)/g, (_, match) => match.toUpperCase());
  return { [camelCaseLabelName]: value };
}

const hostname = os.hostname();
const cwd = process.cwd();
const cwdHash = crypto.createHash('sha256').update(cwd).digest('hex');
const last7Chars = cwdHash.substr(-7);

let basename;
try {
  const packageJson = fs.readFileSync('./package.json');
  const packageData = JSON.parse(packageJson);
  basename = packageData.name;
} catch (error) {
  basename = path.basename(cwd);
}

const defaultAppName = process.env.APP_NAME ?? process.env.PROJECT_NAME ?? `${hostname}_${basename}_${last7Chars}`;
process.env.LOKI_LABEL_APP_NAME = process.env.LOKI_LABEL_APP_NAME || defaultAppName;

const env_labels = Object.entries(process.env)
  .filter(([key]) => key.startsWith("LOKI_LABEL_"))
  .map(([key, value]) => formatLabel(key.substring(11), value));

const labels = {
  NODE_ENV: process.env.NODE_ENV,
  ...Object.assign({}, ...env_labels)
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

// Custom transport for webhook error reporting
class HttpTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.webhookUrl = opts.webhookUrl;
    this.name = 'HttpTransport';
  }

  log(info, callback) {
    if (info.level === 'error') {
      axios.post(this.webhookUrl, {
        text: `Error: ${info.message}`,
        level: info.level,
        timestamp: info.timestamp,
        labels,
        stack: info.stack,
        ...info.metadata
      })
        .then(() => {
          callback(null, true);
        })
        .catch((error) => {
          callback(error);
        });
    } else {
      callback(null, true);
    }
  }
}


const transportsList = [
  _loki,
  new transports.Console({
    format: combine(
      all(),
      label({ label: "version" }),
      timestamp(),
      colorize(),
      align(),
      printf(info => `${formatObject(info.message)}`)
    )
  })
];

if (process.env.ERROR_WEBHOOK_URL) {
  transportsList.push(new HttpTransport({ webhookUrl: process.env.ERROR_WEBHOOK_URL }));
}

export const customLogger = createLogger({
  level: sails.config.log.level,
  transports: transportsList,
});
