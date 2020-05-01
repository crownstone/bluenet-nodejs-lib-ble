let BluenetLib = require("../dist/index");

let bluenet = new BluenetLib.Bluenet();

bluenet.setSettings({
  adminKey:         'adminKeyForCrown',
  memberKey:        'memberKeyForHome',
  basicKey:         'basicKeyForOther',
  serviceDataKey :  'basicKeyForOther',
  localizationKey:  'LocalizationKeyX',
  meshNetworkKey :  'AGreatMeshNetKey',
  meshAppKey :      'MyFavoMeshAppKey',
});

let handle = "e719476672b5"; // this is an UUID in OSX, mac address in Linux. Change this in the example when you run it.
bluenet.connect(handle)
  .then(() => {
    console.log("Write switch state 1")
    return bluenet.control.setSwitchState(0);
  })
  .then(() => {
    console.log("Waiting...")
    return bluenet.wait(2);
  })
  .then(() => {
    console.log("Write switch state 0")
    return bluenet.control.setSwitchState(1);
  })
  .then(() => {
    return bluenet.control.disconnect()
  })
  .then(() => {
    bluenet.quit();
  })
  .catch((err) => { console.log("Error in process...", err); })
