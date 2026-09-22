import {runAll} from './engine.js';
self.onmessage=e=>{const{setup,trials,seed}=e.data;self.postMessage(runAll(setup,trials,seed))};
