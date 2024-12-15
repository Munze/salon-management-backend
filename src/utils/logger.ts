import winston from 'winston';

const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message} `;
  if (metadata.error) {
    msg += `\nError: ${metadata.error}`;
    if (metadata.stack) {
      msg += `\nStack: ${metadata.stack}`;
    }
  }
  if (Object.keys(metadata).length > 0 && !metadata.error && !metadata.stack) {
    msg += `\nMetadata: ${JSON.stringify(metadata, null, 2)}`;
  }
  return msg;
});

export const logger = winston.createLogger({
  level: 'debug', // Set to debug to capture more information
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    customFormat
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        customFormat
      ),
    })
  );
}
