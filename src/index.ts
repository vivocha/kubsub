import { Client } from './client';
export { ClientOptions, Client } from './client';
export { AWSClientOptions, createAWSClient } from './aws';
export { Channel } from './channel';

export let create = Client.create;
