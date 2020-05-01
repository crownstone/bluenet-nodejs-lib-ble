import { StoneTracker } from "../bleHandling/StoneTracker";
import { Advertisement } from "bluenet-nodejs-lib-core";


interface TrackerMap {
  [key: string]: StoneTracker
}

interface ScannerCache {
  [key: string]: {advertisement: Advertisement, peripheral: any}
}
