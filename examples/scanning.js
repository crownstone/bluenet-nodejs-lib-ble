let BluenetLib = require("../dist/index")
let bluenet = new BluenetLib.Bluenet()

bluenet.setSettings({
  adminKey:         'adminKeyForCrown',
  memberKey:        'memberKeyForHome',
  basicKey:         'basicKeyForOther',
  serviceDataKey :  'basicKeyForOther',
  localizationKey:  'LocalizationKeyX',
  meshNetworkKey :  'AGreatMeshNetKey',
  meshAppKey :      'MyFavoMeshAppKey',
});
bluenet.startScanning().catch((err) => { console.log("Error while running example:", err); })

// print scans.
console.log("Starting Scan for 10 seconds");

bluenet.on(BluenetLib.Topics.advertisement,         (data) => { console.log("Got unverified advertisement"); })
bluenet.on(BluenetLib.Topics.verifiedAdvertisement, (data) => { console.log("verified:",data); })

// quit
setTimeout(() => { bluenet.stopScanning(); bluenet.quit(); }, 10000);
