import { ComelitAccessory } from './comelit';
import { ClimaMode, ClimaOnOff, ComelitSbClient, ThermostatDeviceData } from 'comelit-client';
import { ComelitSbPlatform } from '../comelit-sb-platform';
import { CharacteristicEventTypes, PlatformAccessory, Service, VoidCallback } from 'homebridge';

enum TargetHumidifierDehumidifierState {
  HUMIDIFIER_OR_DEHUMIDIFIER = 0,
  HUMIDIFIER = 1,
  DEHUMIDIFIER = 2,
}

enum CurrentHumidifierDehumidifierState {
  INACTIVE = 0,
  IDLE = 1,
  HUMIDIFYING = 2,
  DEHUMIDIFYING = 3,
}

enum Active {
  INACTIVE,
  ACTIVE,
}

export class Dehumidifier extends ComelitAccessory<ThermostatDeviceData> {
  private dehumidifierService: Service;

  constructor(platform: ComelitSbPlatform, accessory: PlatformAccessory, client: ComelitSbClient) {
    super(platform, accessory, client);
  }

  protected initServices(): Service[] {
    const accessoryInformation = this.initAccessoryInformation();
    this.dehumidifierService =
      this.accessory.getService(this.platform.Service.HumidifierDehumidifier) ||
      this.accessory.addService(this.platform.Service.HumidifierDehumidifier);

    const Characteristic = this.platform.Characteristic;
    this.dehumidifierService.addOptionalCharacteristic(
      Characteristic.RelativeHumidityDehumidifierThreshold
    );
    this.dehumidifierService.addOptionalCharacteristic(
      Characteristic.RelativeHumidityHumidifierThreshold
    );
    this.dehumidifierService.addOptionalCharacteristic(Characteristic.Active);
    this.update(this.device);

    this.dehumidifierService
      .getCharacteristic(Characteristic.RelativeHumidityDehumidifierThreshold)
      .on(CharacteristicEventTypes.SET, async (humidity: number, callback: VoidCallback) => {
        try {
          this.log.info(
            `Modifying target humidity threshold of ${this.accessory.displayName}-dehumidifier to ${humidity}%`
          );
          await this.client.setHumidity(parseInt(this.device.id), humidity);
          this.device.soglia_attiva_umi = `${humidity}`;
          callback();
        } catch (e) {
          callback(e);
        }
      });

    this.dehumidifierService
      .getCharacteristic(Characteristic.TargetHumidifierDehumidifierState)
      .on(CharacteristicEventTypes.SET, async (state: number, callback: VoidCallback) => {
        try {
          this.log.info(
            `Modifying target state of ${this.accessory.displayName}-dehumidifier to ${state}`
          );
          switch (state) {
            case TargetHumidifierDehumidifierState.DEHUMIDIFIER:
            case TargetHumidifierDehumidifierState.HUMIDIFIER:
              await this.client.switchHumidifierMode(parseInt(this.device.id), ClimaMode.MANUAL);
              break;
            case TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER:
              await this.client.switchHumidifierMode(parseInt(this.device.id), ClimaMode.AUTO);
              break;
          }
          callback();
        } catch (e) {
          callback(e);
        }
      });

    this.dehumidifierService
      .getCharacteristic(Characteristic.Active)
      .on(CharacteristicEventTypes.SET, async (state: number, callback: VoidCallback) => {
        try {
          this.log.info(
            `Modifying active state of ${this.accessory.displayName}-dehumidifier to ${state}`
          );
          switch (state) {
            case Active.ACTIVE:
              await this.client.switchHumidifierMode(parseInt(this.device.id), ClimaMode.MANUAL);
              break;
            case Active.INACTIVE:
              await this.client.toggleHumidifierStatus(
                parseInt(this.device.id),
                ClimaOnOff.OFF_HUMI
              );
              break;
          }
          callback();
        } catch (e) {
          callback(e);
        }
      });
    return [accessoryInformation, this.dehumidifierService];
  }

  public update(data: ThermostatDeviceData): void {
    const isOff: boolean =
      data.auto_man_umi === ClimaMode.OFF_AUTO || data.auto_man_umi === ClimaMode.OFF_MANUAL;
    const isAuto: boolean = data.auto_man_umi === ClimaMode.AUTO;
    this.log.info(
      `Dehumidifier ${this.accessory.displayName} auto mode is ${isAuto}, off ${isOff}`
    );

    const isDehumidifierOff =
      data.auto_man_umi === ClimaMode.OFF_MANUAL ||
      data.auto_man_umi === ClimaMode.NONE ||
      data.auto_man_umi === ClimaMode.OFF_AUTO;
    const isDehumidifierAuto = data.auto_man_umi === ClimaMode.AUTO;

    this.dehumidifierService
      .getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .updateValue(parseInt(data.umidita));
    this.dehumidifierService
      .getCharacteristic(this.platform.Characteristic.RelativeHumidityHumidifierThreshold)
      .updateValue(parseInt(data.umidita));
    this.dehumidifierService
      .getCharacteristic(this.platform.Characteristic.RelativeHumidityDehumidifierThreshold)
      .updateValue(parseInt(data.soglia_attiva_umi));
    this.dehumidifierService
      .getCharacteristic(this.platform.Characteristic.CurrentHumidifierDehumidifierState)
      .updateValue(
        isDehumidifierOff
          ? CurrentHumidifierDehumidifierState.INACTIVE
          : isDehumidifierAuto
          ? CurrentHumidifierDehumidifierState.IDLE
          : CurrentHumidifierDehumidifierState.DEHUMIDIFYING
      );
    this.dehumidifierService
      .getCharacteristic(this.platform.Characteristic.TargetHumidifierDehumidifierState)
      .updateValue(
        isDehumidifierAuto
          ? TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER
          : TargetHumidifierDehumidifierState.DEHUMIDIFIER
      );
    this.dehumidifierService
      .getCharacteristic(this.platform.Characteristic.Active)
      .updateValue(isDehumidifierOff ? Active.INACTIVE : Active.ACTIVE);
  }
}
