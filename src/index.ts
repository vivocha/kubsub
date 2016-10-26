import { ClientOptions, Client } from './client';
export { ClientOptions, Client } from './client';
export { Channel } from './channel';

export function create(opts:ClientOptions):Promise<Client> {
  return (new Client(opts)).connect();
}
