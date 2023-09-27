import afterHook from "./afterHook";
import { customLogger } from "./prepareConfig"
export default function ToInitialize(sails) {

  if (process.env.LOKI_CONFIG_HOST !== undefined) {
    const prepareConfig = require("./prepareConfig")
    sails.config.log.custom = prepareConfig.customLogger;
  }

  return async function initialize(cb) {
    afterHook();
    cb();
  };
}
