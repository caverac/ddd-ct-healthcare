/**
 * Logger — structured logging via winston.
 *
 * Provides a shared logger instance for the implementation package.
 * Defaults to 'info' level; set LOG_LEVEL env var to override.
 */
import { createLogger, format, transports } from 'winston'

export const logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple())
    })
  ]
})
