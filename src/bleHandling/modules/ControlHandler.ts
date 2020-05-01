import {BleHandler} from "../BleHandler";
import {
  BluenetErrorType,
  ControlPacketsGenerator,
  CrownstoneCharacteristics,
  CSServices,
  EncryptionHandler
} from "bluenet-nodejs-lib-core";


export class ControlHandler {
  ble : BleHandler;


  constructor(ble) {
    this.ble = ble;
  }

  getAndSetSessionNonce() {
    return this.ble.readCharacteristicWithoutEncryption(CSServices.CrownstoneService, CrownstoneCharacteristics.SessionNonce)
      .then((rawNonce : Buffer) => {
        console.log("Got Nonce!");
        let decryptedNonce = EncryptionHandler.decryptSessionNonce(rawNonce, this.ble.settings.basicKey);

        console.log("Decrypted Nonce", decryptedNonce);
        this.ble.settings.setSessionNonce(decryptedNonce);
        console.log("Set Nonce")
      })
      .catch((err) => {
        if (err.type == BluenetErrorType.COULD_NOT_VALIDATE_SESSION_NONCE) {
          throw err;
        }
      })
  }


  setSwitchState(state: number) {
    let switchState = state*100;
    let packet = ControlPacketsGenerator.getSwitchStatePacket(switchState);
    return this._writeControlPacket(packet)
  }

  commandFactoryReset() {
    let packet = ControlPacketsGenerator.getCommandFactoryResetPacket();
    return this._writeControlPacket(packet)
  }

  disconnect() {
    let packet = ControlPacketsGenerator.getDisconnectPacket();
    return this._writeControlPacket(packet)
  }


  _writeControlPacket(packet: Buffer) : Promise<void> {
    return this.ble.writeToCharacteristic(CSServices.CrownstoneService, CrownstoneCharacteristics.Control, packet)
  }

}