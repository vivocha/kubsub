import { ClientOptions, Client } from './client';
export { ClientOptions, Client } from './client';

export function create(opts:ClientOptions):Promise<Client> {
  return (new Client(opts)).connect();
}
