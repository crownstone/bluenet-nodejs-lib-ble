import {BluenetSettings, EventBusClass} from "bluenet-nodejs-lib-core";
import {ControlHandler} from "./bleHandling/modules/ControlHandler";
import {SetupHandler} from "./bleHandling/modules/SetupHandler";
import {BleHandler} from "./bleHandling/BleHandler";
import {Topics} from "./topics/Topics";

export const eventBus = new EventBusClass()

class CloudHandler {
}

export class Bluenet {
  ble: BleHandler;
  settings: BluenetSettings;
  control : ControlHandler;
  setup : SetupHandler;
  cloud : CloudHandler;

  constructor() {
    this.settings = new BluenetSettings();
    this.ble      = new BleHandler(this.settings);
    this.control  = new ControlHandler(this.ble);
    this.setup    = new SetupHandler(this.ble);
    this.cloud    = new CloudHandler();
  }

  /**
   *
   * @param keys
   * @param {string} referenceId
   * @param {boolean} encryptionEnabled
   */
  setSettings(keys : keyMap, referenceId="BluenetNodeJSLib", encryptionEnabled=true) {
    this.settings.loadKeys(encryptionEnabled, keys.adminKey, keys.memberKey, keys.basicKey, keys.serviceDataKey, keys.localizationKey, keys.meshNetworkKey, keys.meshAppKey, referenceId)
  }


  /**
   *
   * @returns {Promise<any>}
   */
  isReady() {
    return this.ble.isReady();
  }



  // linkCloud(userData) {
  //   if (userData.adminKey !== undefined && userData.serviceDataKey !== undefined) {
  //     return new Promise((resolve, reject) => {
  //       console.log("Keys found in userData, no need to link Cloud.");
  //       this.settings.loadKeys(true, userData.adminKey, userData.memberKey, userData.basicKey, userData.serviceDataKey, userData.localizationKey, userData.meshNetworkKey, userData.meshAppKey, "UserData");
  //       resolve();
  //     })
  //   }
  //   else {
  //     return this.cloud.login(userData)
  //       .then(() => {
  //         return this.cloud.getKeys(userData.sphereId);
  //       })
  //       .then((keys : any) => {
  //         this.settings.loadKeys(true, keys.ADMIN_KEY, keys.MEMBER_KEY, keys.BASIC_KEY, keys.SERVICE_DATA_KEY, keys.LOCALIZATION_KEY, keys.MESH_NETWORK_KEY, keys.MESH_APPLICATION_KEY, "CloudData");
  //       })
  //   }
  // }

  connect(connectData, scanDuration = 5) : Promise<void> {
    return this.ble.connect(connectData, scanDuration)
      .then(() => {
        console.log("Getting Session Nonce...");
        return this.control.getAndSetSessionNonce()
      })
      .then(() => {
        console.log("Session Nonce Processed.")
      })
  }

  wait(seconds) {
    return new Promise((resolve, reject) => {
      setTimeout(() => { resolve() }, seconds * 1000);
    })
  }

  setupCrownstone(handle, sphereUid, crownstoneId, meshAccessAddress, meshDeviceKey, ibeaconUUID, ibeaconMajor, ibeaconMinor) {
    return this.connect(handle)
      .then(() => {
        return this.setup.setup(sphereUid, crownstoneId, meshAccessAddress, meshDeviceKey, ibeaconUUID, ibeaconMajor, ibeaconMinor)
      })
  }

  disconnect() {
    return this.ble.disconnect()
  }

  cleanUp() {
    this.ble.cleanUp()
  }

  quit() {
    this.ble.cleanUp();

    // this is a hard quit. Your program will end here.
    process.exit(1);
  }

  startScanning() {
    return this.ble.startScanning()
  }

  stopScanning() {
    this.ble.stopScanning()
  }

  on(topic, callback) {
    return eventBus.on(topic, callback);
  }


  getNearestCrownstone(rssiAtLeast=-100, scanDuration=5, returnFirstAcceptable=false, addressesToExclude=[]) {
    return this._getNearest(false, false, rssiAtLeast, scanDuration, returnFirstAcceptable, addressesToExclude);
  }

  getNearestValidatedCrownstone(rssiAtLeast=-100, scanDuration=5,returnFirstAcceptable=false, addressesToExclude=[]) {
    return this._getNearest(false, true, rssiAtLeast, scanDuration, returnFirstAcceptable, addressesToExclude);
  }

  getNearestSetupStone(rssiAtLeast=-100, scanDuration=5,returnFirstAcceptable=false, addressesToExclude=[]) {
    return this._getNearest(true, true, rssiAtLeast, scanDuration, returnFirstAcceptable, addressesToExclude);
  }

  _getNearest(setupMode, verifiedOnly, rssiAtLeast=-100, scanDuration=5, returnFirstAcceptable=false, addressesToExclude=[]) {
    return new Promise((resolve, reject) => {
      let fallbackTimeout = null;
      let unsubscribe = null;

      let results = [];

      let finalize = () => {
        clearTimeout(fallbackTimeout);
        unsubscribe();
        this.stopScanning();

        if (results.length > 0) {
          results.sort((a,b) => { return a.rssi - b.rssi });
          resolve(results[0]);
        }
        else {
          reject("Timeout: No stones found");
        }
      };

      fallbackTimeout = setTimeout(() => { finalize()}, scanDuration * 1000);

      let checkResults = (data) => {
        if (addressesToExclude.indexOf(data.handle) !== -1 && addressesToExclude.indexOf(data.address) !== -1) {
          return;
        }
        if (data.rssi >= rssiAtLeast) {
          results.push(data);
          if (returnFirstAcceptable) {
            finalize();
          }
        }
      };

      if (verifiedOnly || setupMode) {
        unsubscribe = this.on(Topics.verifiedAdvertisement, (data) => {
          checkResults(data);
        })
      }
      else {
        unsubscribe = this.on(Topics.advertisement, (data) => {
          checkResults(data);
        })
      }

      this.startScanning()
    })
  }
}