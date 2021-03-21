"use strict";

class gameGenerator {
    constructor (config) {
        this.config = Spdl.copyObj(config);
        this.saveData = {};

        if (this.config.seed < 0 || this.config.seed > 1e10) this.config.seed = Math.floor(Math.random()*1e10);
        this.sessionData = {
            contentUnlocked: 0,
            totalContents: 0,
            layers: {},
            timeSpent: 0, // total time spent on this game
            deltaTimeSpent: 0, // time spent without any progress
        }
        this.saveData.layers = {};

        this.caches = {};
        this.caches.layerName = [];

        let idx = 0;
        for (const layer in this.config.layers) {
            this.config.layers[layer] = new Layer(this.config.layers[layer], idx, this.config);
            this.sessionData.totalContents += this.config.layers[layer].upgrade.length;
            this.sessionData.layers[layer] = {
                upgrade: 0,
                prestigeGainReq: new D(0),
                prestigeGainExponent: undefined,
                resetCount: 0,
                prevResetTime: -1,
                unlocked: 0
            };

            this.caches.layerName.push(layer);
            
            this.saveData.layers[layer] = createDefaultLayerSave();

            this.config.layers[layer].unlock.when = this.config.layers[layer].unlock.when.bind(this);
            this.config.layers[layer].unlock.whenUnlocked = this.config.layers[layer].unlock.whenUnlocked.bind(this);

            idx++;
        }

        this.simulateLoop = undefined;

        return this;
    }

    start() {
        this.simulateLoop = setInterval(() => {this.generateTick()}, this.config.runSpeed);

        return this;
    }

    stop() {
        clearInterval(this.simulateLoop);

        return this;
    }

    generateTick() {
        if (windowBlured) return;
        
        let sd = this.sessionData;
        let cfg = this.config;
        
        sd.timeSpent += cfg.speed;
        sd.deltaTimeSpent += cfg.speed;

        let layerResMult = {};
        for (const layer in cfg.layers) {
            // short var set
            let thisLayer = cfg.layers[layer];
            let thisSave = this.saveData.layers[layer];
            let thisSession = sd.layers[layer];

            
            // layer
            if (!thisSession.unlocked && thisLayer.unlock.when()) {
                thisSession.unlocked = thisLayer.unlock.when();
                thisLayer.unlock.whenUnlocked();
            }

            // prestige
            if (
                thisLayer.index != 0 &&
                thisLayer.unlock.when() &&
                (new Date().getTime()-thisSession.prevResetTime)*this.config.speed > 10e3 &&
                (thisSession.resetCount < 1 || this.saveData.layers[this.caches.layerName[thisLayer.index-1]].resource.gt(thisSession.prestigeGainReq)) &&
                (thisSession.resetCount < 2 || thisSave.resource.eq(0) || thisSave.resource.mul(1.5).pow(1.04).lt(this.getPrestigeGain(thisLayer)) )
            ) {
                let prevLayer = this.saveData.layers[this.caches.layerName[thisLayer.index-1]];
                const prevRes = prevLayer.resource;
                let tempGot;

                switch (thisSession.resetCount) {
                    case 0:
                        tempGot = new D(1);
                        thisSession.prestigeGainReq = new D(prevRes);
                        if (this.config.clearify) thisSession.prestigeGainReq = Spdl.clearify(thisSession.prestigeGainReq);
                        break;
                    case 1:
                        tempGot = new D(thisLayer.index+1).pow(2);
                        thisSession.prestigeGainPow = new D(1).div(prevRes.div(thisSession.prestigeGainReq).log(tempGot));
                        break;
                    default:
                        tempGot = this.getPrestigeGain(thisLayer);
                }
                
                thisSession.prevResetTime = new Date().getTime();
                thisSave.resource = thisSave.resource.add(tempGot);
                thisSession.resetCount++;
                this.prestige(thisLayer);
            }


            // inner layer
            if (!thisSession.unlocked) continue;
            layerResMult[layer] = new D(1);
            
            // upgrade, buy
            for (let i = 0, l = thisLayer.upgrade.length; i < l; i++) {
                if (!thisSave.upgradeBought.includes(i) && typeof thisLayer.upgrade[i].cost !== "undefined" && thisSave.resource.gt(thisLayer.upgrade[i].cost)) {
                    thisSave.resource = thisSave.resource.sub(thisLayer.upgrade[i].cost);
                    thisSave.upgradeBought.push(i);
                }

                if (thisSave.upgradeBought.includes(i)) {
                    layerResMult[layer] = layerResMult[layer][thisLayer.upgrade[i].boostType](thisLayer.upgrade[i].boost());
                }
            }

            // make upgrade
            const upgradeIdx = sd.layers[layer].upgrade;
            if (
                thisLayer.upgrade.length > sd.layers[layer].upgrade &&
                (thisLayer.index == 0 || thisSession.resetCount >= 2) &&
                (upgradeIdx == 0 || thisSave.resource.gt(thisLayer.upgrade[sd.layers[layer].upgrade-1].cost.add(1))) &&
                sd.deltaTimeSpent/1000 > this.getLayerDifficulty(thisLayer)*(0.4+((cfg.seed+upgradeIdx**5)%24)/4)
            ) {
                thisLayer.upgrade[upgradeIdx].cost = new D(thisSave.resource).div(2);
                if (cfg.clearify) thisLayer.upgrade[upgradeIdx].cost = Spdl.clearify(thisLayer.upgrade[upgradeIdx].cost);

                sd.deltaTimeSpent = 0;
                sd.contentUnlocked++;
                sd.layers[layer].upgrade++;
            }

            layerResMult[layer] = layerResMult[layer].mul(this.getResourceMultiplayer(thisLayer));
        }

        // increment resource
        for (const layer in cfg.layers) {
            let thisLayer = cfg.layers[layer];
            let thisSave = this.saveData.layers[layer];

            thisSave.resource = thisSave.resource.add(thisLayer.baseResourceGenerate.mul(layerResMult[layer]).mul(cfg.speed/1000));
        }

        this.displayGenerated();

        /*if (sd.totalContents == sd.contentUnlocked) {
            clearInterval(this.simulateLoop);
            document.getElementById("generateDisplay").innerHTML = "done!<br><br>turn into a html file isn't supported yet...";
        }*/
    }

    prestige (targetLayer) {
        for (const layer in this.saveData.layers) {
            let thisLayer = this.config.layers[layer];
            if (targetLayer.index <= thisLayer.index) continue;
            this.saveData.layers[layer] = createDefaultLayerSave();
        }
    }

    getPrestigeGain (layer) {
        const thisSession = this.sessionData.layers[this.caches.layerName[layer.index]];
        return this.saveData.layers[this.caches.layerName[layer.index-1]].resource.div(thisSession.prestigeGainReq).pow(thisSession.prestigeGainPow);
    }

    displayGenerated() {
        let displayTxt = "";
        displayTxt += `You've spent ${Spl.timeNotation(this.sessionData.timeSpent/1000)} in this game<br>Difficulty: ${notation(this.getSessionDifficulty())}<br><br>`;
        for (const layer in this.config.layers) {
            const thisLayer = this.config.layers[layer];
            const thisSave = this.saveData.layers[layer];
            const thisSession = this.sessionData.layers[layer];

            if (!thisSession.unlocked) displayTxt += "<del>";
            displayTxt += `You have ${notation(thisSave.resource)} ${thisLayer.resourceName} (${thisLayer.shortResourceName})<br>`;
            if (thisLayer.index != 0) displayTxt += `Prestige gain factor: /${notation(thisSession.prestigeGainReq)}, ^${notation(thisSession.prestigeGainPow, 4, 6)}<br>`;
            displayTxt += `${this.sessionData.layers[layer].upgrade}/${thisLayer.upgrade.length} Upgrades generated so far... (have ${thisSave.upgradeBought.length} now)<br>`;
            displayTxt += `Difficulty: ${notation(this.getLayerDifficulty(thisLayer))}<br>`;
            displayTxt += "<br>";
            if (!thisSession.unlocked) displayTxt += "</del>";
        }

        document.getElementById("generateDisplay").innerHTML = displayTxt;
    }

    getResourceMultiplayer(layer) {
        const thisLayerIdx = layer.index;
        return this.caches.layerName.reduce(
            (a, b) => a.mul(this.saveData.layers[b].resource.mul(1*(this.config.layers[b].index > thisLayerIdx)).add(1).pow(this.config.layers[b].index+1)),
            new D(1)
        );
    }

    getLayerDifficulty(layer) {
        return layer.difficultyMultiply*this.getSessionDifficulty();
    }

    getSessionDifficulty() {
        return this.config.difficulty+this.sessionData.contentUnlocked*this.config.deltaDifficulty;
    }
}

function createDefaultLayerSave() {
    return {
        resource: new D(0),
        upgradeBought: []
    };
}