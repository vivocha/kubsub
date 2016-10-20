import * as debug from 'debug';

export default function getLogger(label:string) {
  return {
    log: debug(label + ':log'),
    info: debug(label + ':info'),
    warn: debug(label + ':warn'),
    error: debug(label + ':error'),
    debug: debug(label + ':debug')
  }
}

export const console = getLogger('kubsub');
