"use strict";

let generateConfig = {
    gameName: "basicIncremental", // id of game; localStorage key = "IGG" + gameName
    layers: {
        basic: {
            name: "Basic",
            upgradeCount: 300,
            baseResourceGenerate: new D(1)
        },
        advenced: {
            unlock: {
                when: function() {
                    return this.saveData.layers.basic.upgradeBought.length >= 50
                },
                whenUnlocked: function() {
                    this.config.layers.basic.difficultyMultiply = this.config.layers.basic.difficultyMultiply*7;
                    this.config.difficulty /= 3;
                }
            },
            name: "Advanced",
            upgradeCount: 250,
            difficultyMultiply: 3
        },
        mastered: {
            unlock: {
                when: function() {
                    return this.saveData.layers.advenced.upgradeBought.length >= 25
                }
            },
            name: "Mastered",
            upgradeCount: 200,
            difficultyMultiply: 2.9
        },
        transcended: {
            unlock: {
                when: function() {
                    return this.saveData.layers.mastered.upgradeBought.length >= 25
                }
            },
            name: "Transcended",
            upgradeCount: 150,
            difficultyMultiply: 2.8
        },
        "Ran Out": {
            unlock: {
                when: function() {
                    return this.saveData.layers.transcended.upgradeBought.length >= 25
                }
            },
            name: "Ran Out",
            upgradeCount: 100,
            difficultyMultiply: 2.7
        },
        "of Layer": {
            unlock: {
                when: function() {
                    return this.saveData.layers["Ran Out"].upgradeBought.length >= 25
                }
            },
            name: "of Layer",
            upgradeCount: 80,
            difficultyMultiply: 2.6
        },
        "Name Idea lol": {
            unlock: {
                when: function() {
                    return this.saveData.layers["of Layer"].upgradeBought.length >= 25
                }
            },
            name: "Name Idea lol",
            upgradeCount: 60,
            difficultyMultiply: 2.5
        }
    }, // data of layers
    contents: 0, //
    difficulty: 2.6, // this is affect to progress speed (highter -> longer)
    deltaDifficulty: 0.02, // difficulty increases over progress (def. difficulty += deltaDifficulty)
    seed: -1, // seed, -1 to random (0 ~ 1e10)
    speed: 2000, // generate speed in ms/loop, increasing this will cause quality down
    runSpeed: 10, // generate function will loop per 'x ms'
    clearify: true, // make generated values clear. ex) 1.2345e8324 -> 1.2e8324
}

class Layer {
    constructor(attr={}, layerIdx, config) {
        this.name = attr.name || "Basic"; // name of the layer
        this.resourceName = this.resourceName || attr.name + " Point";
        this.shortResourceName = this.resourceName.includes(" ") ? this.resourceName.split(" ").reduce((a, b) => a+b[0], "").toUpperCase() : this.resourceName;

        this.index = attr.index || layerIdx; // index of layer (it's better to not change this)

        this.upgrade = []; // define upgrade
        for (let i = 0; i < attr.upgradeCount; i++) this.upgrade.push(new Upgrade(this.index, this.upgrade.length, config)); // fill upgrades

        this.unlock = new LayerUnlock(this.index, attr.unlock || {}); // see class LayerUnlock
        
        this.difficultyMultiply = typeof attr.difficultyMultiply !== "undefined" ? attr.difficultyMultiply : 1;
        this.baseResourceGenerate = attr.baseResourceGenerate || new D(0);
    }
}

class LayerContents {
    constructor (layerIdx) {
        this.layerIdx = layerIdx;
    }

    getLayer(config) {
        return config.layers[caches.layerName[this.layerIdx]];
    }
}

class Upgrade extends LayerContents {
    constructor(layerIdx, upgradeIdx, config) {
        super(layerIdx);

        this.index = upgradeIdx;

        const innerSeed = config.seed+this.index**2;
        const upgradeTemple = upgradeVariety[innerSeed%(Math.min(upgradeVariety.length+this.layerIdx, upgradeVariety.length))];
        
        this.boost = upgradeTemple.boost({seed: innerSeed, index: this.index});
        this.desc = upgradeTemple.desc;
        this.cost = undefined;
        this.boostType = upgradeTemple.boostType;
        this.boostTo = Object.keys(config.layers)[layerIdx ? innerSeed%layerIdx : 0];
    }

    getBoostString() {
        return this.boost
        .replace("$Boost", notation(this.boost()))
        .replace("$Resource", getLayer().shortResourceName);
    }
}

class LayerUnlock extends LayerContents {
    constructor(layerIdx, attr={}) {
        super(layerIdx);

        this.when = attr.when || function(){return 1;}; // bool, when to unlock
        this.whenUnlocked = attr.whenUnlocked || function(){return 0;}; // do something when unlocked (this won't be exported, change config only)
    }
}

const upgradeVariety = [
    // 0
    {
        desc: `Multiply $Rescource gain by x$Boost`,
        boost: function(attr={}) {return new Function(`return new D(${attr.seed}%6+4).pow(new D(${attr.index}+1).pow(0.4)).floor(0)`)},
        boostType: "mul"
    }
];
