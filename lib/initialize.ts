import afterHook from "./afterHook";
export default function ToInitialize(sails) {

  if (process.env.LOKI_CONFIG_HOST !== undefined) {
    try {
      const prepareConfig = require("./prepareConfig");
      sails.config.log.custom = prepareConfig.customLogger;
    } catch (error) {
      console.error("An error occurred while loading the prepareConfig module:", error);
    }

  } else {
    console.debug(`process.env.LOKI_CONFIG_HOST is undefined, skip loki initialization`)
  }

  return async function initialize(cb) {
    afterHook();
    cb();
  };
}
