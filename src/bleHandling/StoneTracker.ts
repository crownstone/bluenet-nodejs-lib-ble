import {Advertisement} from "../../packets/Advertisement";
import {ServiceData} from "../../packets/ServiceData";

const AMOUNT_OF_REQUIRED_MATCHES = 2;
const RSSI_TIMEOUT_DURATION_MS = 3000;

export class StoneTracker {
  uniqueIdentifier: string;

  crownstoneId: number;
  verified = false;
  dfu = false;
  consecutiveMatches = 0;

  rssi = 0;
  rssiHistory = {};
  name = 'undefined';
  handle = null;
  avgRssi = 0;
  lastUpdate = 0;
  timeoutTime = 0;
  timeoutDuration = 0;
  rssiTimeoutList = [];

  constructor() {}

  update(advertisement: Advertisement) {
    this.name = advertisement.name;
    this.handle = advertisement.handle;
    this.avgRssi = advertisement.rssi;
    if (advertisement.isCrownstoneFamily()) {
      this.handlePayload(advertisement);
    }
  }

  handlePayload(advertisement) {
    this.rssi = advertisement.rssi;

    let now = new Date().valueOf();

    this.lastUpdate = now;

    this.rssiHistory[now] = this.rssi;
    setTimeout(() => { delete this.rssiHistory[now]; this.calculateRssiAverage(); }, RSSI_TIMEOUT_DURATION_MS);

    if (advertisement.isInDFUMode()) {
      this.verified = true;
      this.dfu = true;
      this.consecutiveMatches = 0;
    }
    else {
      this.verify(advertisement.scanResponse);

      this.avgRssi = this.calculateRssiAverage();
    }
  }

  // check if (we consistently get the ID of this crownstone.
  verify(serviceData : ServiceData) {
    if (serviceData.isSetupPackage()) {
      this.verified = true;
      this.consecutiveMatches = 0;
    }
    else {
      if (serviceData.dataReadyForUse === false) {
        this.invalidateDevice(serviceData);
      }
      else {
        if (this.uniqueIdentifier != serviceData.uniqueIdentifier) {
          if (serviceData.validation != 0 && serviceData.opCode == 5) {
            if (serviceData.dataType != 1) {
              if (serviceData.validation == 0xFA) { // datatype 1 is the error packet
                this.addValidMeasurement(serviceData)
              }
              else if (serviceData.validation != 0xFA) { // datatype 1 is the error packet
                this.invalidateDevice(serviceData)
              }
            }
          }
          else if (serviceData.validation != 0 && serviceData.opCode == 3) {
            if (serviceData.dataType != 1) {
              if (serviceData.validation == 0xFA) { // datatype 1 is the error packet
                this.addValidMeasurement(serviceData)
              }
              else if (serviceData.validation != 0xFA) { // datatype 1 is the error packet
                this.invalidateDevice(serviceData)
              }
            }
          }
          else {
            if (serviceData.stateOfExternalCrownstone == false) {
              if (serviceData.crownstoneId == this.crownstoneId) {
                this.addValidMeasurement(serviceData)
              }
              else {
                this.invalidateDevice(serviceData)
              }
            }
          }
        }
      }
    }
    this.uniqueIdentifier = serviceData.uniqueIdentifier
  }


  addValidMeasurement(serviceData) {
    if (this.consecutiveMatches >= AMOUNT_OF_REQUIRED_MATCHES) {
      this.verified = true;
      this.consecutiveMatches = 0
    }
    else {
      this.consecutiveMatches += 1
    }

    this.crownstoneId = serviceData.crownstoneId
  }


  invalidateDevice(serviceData) {
    if (!serviceData.stateOfExternalCrownstone) {
      this.crownstoneId = serviceData.crownstoneId
    }
    this.consecutiveMatches = 0;
    this.verified = false
  }


  calculateRssiAverage() {
    let count = 0;
    let total = 0;

    let keys = Object.keys(this.rssiHistory);
    for ( let i = 0; i < keys.length; i++ ) {
      count++;
      total += this.rssiHistory[keys[i]];
    }

    if (count > 0) {
      return total / count
    }
    else {
      return 0
    }
  }
}
        