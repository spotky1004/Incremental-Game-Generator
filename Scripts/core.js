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
        caches.layerName = [];

        let idx = 0;
        for (const layer in this.config.layers) {
            this.config.layers[layer] = new Layer(this.config.layers[layer], idx, this.config);
            this.sessionData.totalContents += this.config.layers[layer].upgrade.length;
            this.sessionData.layers[layer] = {
                upgrade: 0,
                resetCount: 0,
                prevReset: new D(0),
                prevResetTime:-1
            };

            caches.layerName.push(layer);
            
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

            
            // layer
            if (!thisSave.unlocked && thisLayer.unlock.when()) {
                thisSave.unlocked = thisLayer.unlock.when();
                thisLayer.unlock.whenUnlocked();
            }


            // inner layer
            if (!thisSave.unlocked) continue;
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
                sd.deltaTimeSpent/1000 > this.getLayerDifficulty(thisLayer)*(0.4+((cfg.seed+upgradeIdx**5)%24)/4)
            ) {
                thisLayer.upgrade[upgradeIdx].cost = new D(thisSave.resource);
                if (cfg.clearify) thisLayer.upgrade[upgradeIdx].cost = Spdl.clearify(thisLayer.upgrade[upgradeIdx].cost);

                sd.deltaTimeSpent = 0;
                sd.contentUnlocked++;
                sd.layers[layer].upgrade++;
            }

            // increment resource
            thisSave.resource = thisSave.resource.add(thisLayer.baseResourceGenerate.mul(layerResMult[layer]).mul(cfg.speed/1000));
        }
        this.displayGenerated();

        if (sd.totalContents == sd.contentUnlocked) {
            clearInterval(this.simulateLoop);
            document.getElementById("generateDisplay").innerHTML = "done!<br><br>turn into a html file isn't supported yet...";
        }
    }

    prestige (targetLayer) {
        for (const layer in this.saveData.layers) {
            let thisLayer = this.saveData.layers[layer];
            if (targetLayer.index <= thisLayer.index) continue;
            layer = createDefaultLayerSave();
        }
    }

    displayGenerated() {
        let displayTxt = "";
        displayTxt += `You've spent ${Spl.timeNotation(this.sessionData.timeSpent/1000)} in this game<br>Difficulty: ${notation(this.getSessionDifficulty())}<br><br>`;
        for (const layer in this.config.layers) {
            const thisLayer = this.config.layers[layer];
            const thisSave = this.saveData.layers[layer];

            if (!thisSave.unlocked) displayTxt += "<del>";
            displayTxt += `You have ${notation(thisSave.resource)} ${thisLayer.resourceName} (${thisLayer.shortResourceName})<br>`;
            displayTxt += `${this.sessionData.layers[layer].upgrade}/${thisLayer.upgrade.length} Upgrades generated so far...<br>`;
            displayTxt += `Difficulty: ${notation(this.getLayerDifficulty(thisLayer))}<br>`;
            displayTxt += "<br>";
            if (!thisSave.unlocked) displayTxt += "</del>";
        }

        document.getElementById("generateDisplay").innerHTML = displayTxt;
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
        upgradeBought: [],
        unlocked: 0
    };
}