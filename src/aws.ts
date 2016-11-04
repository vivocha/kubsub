import { ClientOptions, Client } from './client';
import { SeedRetriever } from './node';

const AWS = require('aws-sdk');

export interface AWSClientOptions {
  usePublicAddress?:boolean;
  port?:number;
  refresh?:number;
  namespace?:string;
  awsTagName:string;
  awsTagValue:string;
}

function getSeedRetriever(opts:AWSClientOptions, address:string = Client.DEFAULT_ADDRESS):SeedRetriever {
  return () => {
    return new Promise((resolve, reject) => {
      new AWS.MetadataService().request('/latest/dynamic/instance-identity/document', function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(data));
        }
      });
    }).then(({ region }) => {
      return new Promise((resolve, reject) => {
        const ec2 = new AWS.EC2({ region });
        ec2.describeInstances({
          Filters: [
            {
              Name: 'tag:' + opts.awsTagName,
              Values: [ opts.awsTagValue ]
            }
          ]
        }, function(err, { Reservations: data }) {
          if (err) {
            reject(err);
          } else {
            let instances = [];
            for (let i of data) {
              instances = instances.concat(i.Instances || []);
            }
            let prop:string = opts.usePublicAddress ? 'PublicIpAddress' : 'PrivateIpAddress';
            resolve(instances
              .filter(i => i[prop] !== address)
              .map(i => ({ address: i[prop], port: opts.port || Client.DEFAULT_PORT })));
          }
        });
      });
    }).then((instances:any[]) => {
      if (instances.length === 0) {
        instances.push({ address, port: opts.port || Client.DEFAULT_PORT });
      }
      console.log('instances', instances);
      return instances;
    });
  }
}

export function createAWSClient(opts:AWSClientOptions):Promise<Client> {
  return new Promise((resolve, reject) => {
    new AWS.MetadataService().request(`/latest/meta-data/${ opts.usePublicAddress ? 'public-ipv4' : 'local-ipv4'}`, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  }).then((address:string) => {
    let _opts:ClientOptions = {
      address: address,
      port: opts.port || Client.DEFAULT_PORT,
      seeds: getSeedRetriever(opts, address),
      refresh: opts.refresh,
      namespace: opts.namespace
    };
    return Client.create(_opts);
  });
}