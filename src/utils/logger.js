
const winston = require('winston');
const util =require('util');

let logger = null;

let initLogger = function(allFile, errorFile) {
  if (logger != null) {
    return logger;
  }
  
  // Define your severity levels.
  // With them, You can create log files,
  // see or hide levels based on the running ENV.
  const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
  }

  // This method set the current severity based on
  // the current NODE_ENV: show all the log levels
  // if the server was run in development mode; otherwise,
  // if it was run in production, show only warn and error messages.
  const level = () => {
    const env = process.env.NODE_ENV || 'development'
    const isDevelopment = env === 'development'
    return isDevelopment ? 'debug' : 'warn'
  }

  // Define different colors for each level.
  // Colors make the log message more visible,
  // adding the ability to focus or ignore messages.
  const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'white',
    debug: 'white',
    silly: 'white'
  }

  // Tell winston that you want to link the colors
  // defined above to the severity levels.
  winston.addColors(colors)

  // Chose the aspect of your log customizing the log format.
  const format = winston.format.combine(
    // Add the message timestamp with the preferred format
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    // Tell Winston that the logs must be colored
    // winston.format.colorize({ all: true }),
    // Define the format of the message showing the timestamp, the level and the message
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
  )

  // Chose the aspect of your log customizing the log format.
  const formatConsole = winston.format.combine(
    // Add the message timestamp with the preferred format
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    // Tell Winston that the logs must be colored
    winston.format.colorize({ all: true }),
    // Define the format of the message showing the timestamp, the level and the message
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
  )

  // Define which transports the logger must use to print out messages.
  // In this example, we are using three different transports
  const transports = [
    // Allow the use the console to print the messages
    new winston.transports.Console({format: formatConsole}),
    // Allow to print all the error level messages inside the error.log file
    new winston.transports.File({
      filename: errorFile, //process.env.LOGGER_ERROR_FILE || 'logs/error.log',
      level: 'error',
    }),
    // Allow to print all the error message inside the all.log file
    // (also the error log that are also printed inside the error.log(
    new winston.transports.File({ 
      filename: allFile, //process.env.LOGGER_ALL_FILE || 'logs/all.log' 
    }),
  ]

  // Create the logger instance that has to be exported
  // and used to log messages.
  logger = winston.createLogger({
    level: level(),
    levels,
    format,
    transports,
  });

  return logger;
}

let orig_console = null;
const captureConsoleLog = function() {
    if (orig_console == null) {
        orig_console = {
            debug: console.debug,
            error: console.error,
            info: console.info,
            log: console.log,
            trace: console.trace,
            warn: console.warn,
        };
        console.debug = function(...msg) {
          logger.debug(util.format(...msg));
        };

        console.error = function(...msg) {
            logger.error(util.format(...msg));
        };

        console.info = function(...msg) {
            logger.info(util.format(...msg));
        };

        console.log = function(...msg) {
            logger.info(util.format(...msg));
        };

        console.trace = function(...msg) {
            logger.trace(util.format(...msg));
        };

        console.warn = function(...msg) {
            logger.warn(util.format(...msg));
        };
    }
};

module.exports = {
    initLogger,
    logger,
    captureConsoleLog
};