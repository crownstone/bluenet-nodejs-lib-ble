import {BleHandler} from "../BleHandler";
import {SetupCharacteristics} from "../../../protocol/Characteristics";
import {CSServices} from "../../../protocol/Services";
import {ControlPacketsGenerator} from "../../../protocol/ControlPackets";
import {BluenetError, BluenetErrorType} from "../../../BluenetError";
import {ResultPacket} from "../../../packets/ResultPacket";
import {ProcessType, ResultValue} from "../../../protocol/BluenetTypes";
import {LOG} from "../../../util/logging/Log";


export class SetupHandler {
  ble : BleHandler;

  constructor(ble) {
    this.ble = ble;
  }


  setup(sphereUid, crownstoneId, meshAccessAddress, meshDeviceKey, ibeaconUUID, ibeaconMajor, ibeaconMinor) {
    return new Promise((resolve, reject) => {
      if (!this.ble.settings.adminKey || !this.ble.settings.memberKey || !this.ble.settings.basicKey || !this.ble.settings.serviceDataKey || !this.ble.settings.localizationKey || !this.ble.settings.meshAppKey || !this.ble.settings.meshNetworkKey) {
        return reject(new BluenetError(BluenetErrorType.NO_ENCRYPTION_KEYS, "No encryption keys available. These are required to setup a Crownstone. Use either linkCloud or setSettings to load keys into Bluenet."))
      }

      if (this.ble.connectedPeripheral.characteristics[CSServices.SetupService][SetupCharacteristics.Control]) {
        resolve(this._performFastSetupV2(sphereUid, crownstoneId, meshDeviceKey, ibeaconUUID, ibeaconMajor, ibeaconMinor));
      }
      else {
        reject(new BluenetError(BluenetErrorType.INCOMPATIBLE_FIRMWARE, "This Crownstone has an old firmware and is not compatible with this lib."))
      }
    })
  }


  _performFastSetupV2(sphereUid, crownstoneId, meshDeviceKey, ibeaconUUID, ibeaconMajor, ibeaconMinor) {
    let processHandler = (returnData) => {
      let packet = new ResultPacket(returnData);
      if (packet.valid) {
        let payload = packet.payload.readUInt16LE(0);
        if (payload == ResultValue.WAIT_FOR_SUCCESS) {
          // thats ok
          return ProcessType.CONTINUE
        }
        else if (payload == ResultValue.SUCCESS) {
          return ProcessType.FINISHED
        }
        else {
          return ProcessType.ABORT_ERROR
        }
      }
      else {
        // stop, something went wrong
        return ProcessType.ABORT_ERROR
      }
    };

    let writeCommand = () => {
      this._commandSetupV2(
        sphereUid,
        crownstoneId,
        this.ble.settings.adminKey,
        this.ble.settings.memberKey,
        this.ble.settings.basicKey,
        this.ble.settings.serviceDataKey,
        this.ble.settings.localizationKey,
        this.ble.settings.meshNetworkKey,
        this.ble.settings.meshAppKey,
        meshDeviceKey,
        ibeaconUUID,
        ibeaconMajor,
        ibeaconMinor
      );
    };

    return this._handleSetupPhaseEncryption()
      .then(() => {
        return this.ble.setupNotificationStream(
          CSServices.SetupService,
          SetupCharacteristics.Result,
          writeCommand,
          processHandler,
          3
        )
      })
      .then(() => {
        LOG.info("BLUENET_LIB: SetupCommand Finished, disconnecting");
        return this.ble.waitForPeripheralToDisconnect(10)
      })
      .then(() => {
        LOG.info("BLUENET_LIB: Setup Finished");
        this.ble.settings.exitSetup()
      })
      .catch((err) => {
        this.ble.settings.exitSetup();
        this.ble.settings.restoreEncryption();
        this.ble.errorDisconnect();
        throw err
      })
  }



  _handleSetupPhaseEncryption() : Promise<void> {
    return new Promise((resolve, reject) => {
        this.ble.settings.disableEncryptionTemporarily();
        this._getSessionKey()
          .then((key) => {
            this.ble.settings.loadSetupKey(key);
            return this._getSessionNonce()
          })
          .then((nonce) => {
            this.ble.settings.setSessionNonce(nonce);
            this.ble.settings.restoreEncryption();
            resolve()
          })
          .catch((err: Error) => {
            this.ble.settings.restoreEncryption();
            reject(err)
          })
      })
  }

  _commandSetupV2(
    sphereUid,
    crownstoneId,
    adminKey,
    memberKey,
    basicKey,
    serviceDataKey,
    localizationKey,
    meshNetworkKey,
    meshAppKey,
    meshDeviceKey,
    ibeaconUUID,
    ibeaconMajor,
    ibeaconMinor
  ) {
    let packet = ControlPacketsGenerator.getSetupPacketV2(
      sphereUid,
      crownstoneId,
      adminKey,
      memberKey,
      basicKey,
      serviceDataKey,
      localizationKey,
      meshNetworkKey,
      meshAppKey,
      meshDeviceKey,
      ibeaconUUID,
      ibeaconMajor,
      ibeaconMinor
    );
    return this.ble.writeToCharacteristic(
      CSServices.SetupService,
      SetupCharacteristics.Control,
      packet
    )
  }


  _commandSetup(crownstoneId, adminKey, memberKey, guestKey, meshAccessAddress, ibeaconUUID, ibeaconMajor, ibeaconMinor) {
    let packet = ControlPacketsGenerator.getSetupPacket(
    0,
      crownstoneId,
      adminKey,
      memberKey,
      guestKey,
      meshAccessAddress,
      ibeaconUUID,
      ibeaconMajor,
      ibeaconMinor
    );
    return this.ble.writeToCharacteristic(
      CSServices.SetupService,
      SetupCharacteristics.Control,
      packet
    )
  }

  _getSessionKey() : Promise<Buffer> {
    return this.ble.readCharacteristicWithoutEncryption(CSServices.SetupService, SetupCharacteristics.SessionKey)
  }

  _getSessionNonce() : Promise<Buffer> {
    return this.ble.readCharacteristicWithoutEncryption(CSServices.SetupService, SetupCharacteristics.SessionNonce)
  }

}