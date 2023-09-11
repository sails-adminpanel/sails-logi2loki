import afterHook from "./afterHook";
import { customLogger } from "./prepareConfig"
export default function ToInitialize(sails) {
  if (process.env.LOKI_CONFIG_HOST !== undefined) {
    sails.config.log.custom = customLogger;
  }
  return async function initialize(cb) {
    afterHook();
    cb();
  };
}
