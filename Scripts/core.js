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

        Object.keys(this.config.layers).forEach((layer, idx) => {
            this.config.layers[layer] = new Layer(this.config.layers[layer], idx);
            this.sessionData.totalContents += this.config.layers[layer].upgrade.length;
            this.sessionData.layers[layer] = {};
            this.sessionData.layers[layer].upgrade = 0;

            caches.layerName.push(layer);

            this.saveData.layerUnlocked = 0;
            this.saveData.layers[layer] = {
                resource: new D(0),
                upgradeBought: []
            };
        })

        this.simulateLoop = undefined;
    }

    start() {
        this.simulateLoop = setInterval(() => {this.generateTick()}, 10);
    }

    stop() {
        clearInterval(this.simulateLoop);
    }

    generateTick() {
        if (windowBlured) return;
        
        let sd = this.sessionData;
        let cfg = this.config;
        
        sd.timeSpent += cfg.speed;
        sd.deltaTimeSpent += cfg.speed;

        let layerResMult = {};
        for (const layer in cfg.layers) {
            layerResMult[layer] = new D(1);
            const thisLayer = cfg.layers[layer];
            const thisSave = this.saveData.layers[layer];

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
                thisSave.upgradeBought.push(upgradeIdx);
                thisLayer.upgrade[upgradeIdx].cost = new D(thisSave.resource);
                if (cfg.clearify) thisLayer.upgrade[upgradeIdx].cost = Spdl.clearify(thisLayer.upgrade[upgradeIdx].cost);
                thisSave.resource = thisSave.resource.sub(thisLayer.upgrade[upgradeIdx].cost);

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

    displayGenerated() {
        let displayTxt = "";
        displayTxt += `You've spent ${Spl.timeNotation(this.sessionData.timeSpent/1000)} in this game<br><br>`;
        for (const layer in this.config.layers) {
            displayTxt += `You have ${notation(this.saveData.layers[layer].resource)} ${this.config.layers[layer].resourceName} (${this.config.layers[layer].shortResourceName})<br>`;
            displayTxt += `${this.sessionData.layers[layer].upgrade}/${this.config.layers[layer].upgrade.length} Upgrades generated so far...<br>`;
            displayTxt += "<br>";
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