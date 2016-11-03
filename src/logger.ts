import { Logger } from 'kad';
import * as debug from 'debug';

export default function getLogger(label:string):Logger {
  return {
    log: debug(label + ':log'),
    info: debug(label + ':info'),
    warn: debug(label + ':warn'),
    error: debug(label + ':error'),
    debug: debug(label + ':debug')
  }
}

export const console = getLogger('kubsub');
