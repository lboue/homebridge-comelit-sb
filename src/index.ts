import { ComelitSbPlatform } from './comelit-sb-platform';
import { Homebridge } from '../types';

export let HomebridgeAPI: Homebridge;

export default function(homebridge: Homebridge) {
  HomebridgeAPI = homebridge;
  homebridge.registerPlatform(
    'homebridge-comelit-sb',
    'Comelit Serial Bridge',
    ComelitSbPlatform,
    true
  );
}