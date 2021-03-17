let generateConfig = {
    gameName: "basicIncremental",
    layers: {
        basic: {
            name: "Basic",
            upgradeCount: 300,
            baseResourceGenerate: new D(1)
        },
        advenced: {
            unlock: {
                when: () => {saveData.layers.basic.upgradeBought.length >= 50},
            },
            name: "Advanced",
            upgrades: 30
        }
    }, // data of layers
    contents: 0, //
    difficulty: 3, // this is affect to progress speed (highter -> longer)
    deltaDifficulty: 0.1, // difficulty increases over progress (def. difficulty += deltaDifficulty)
    seed: -1, // seed, -1 to random (0 ~ 1e10)
    speed: 300, // generate speed in ms/loop, increasing this will cause quality down
    clearify: true, // make generated values clear. ex) 1.2345e8324 -> 1.2e8324
}

let gameData = {};

let layerIndex = 0;
class Layer {
    constructor(attr={}) {
        this.name = attr.name || "Basic"; // name of the layer
        this.resourceName = this.resourceName || attr.name + " Point";
        this.shortResourceName = this.resourceName.includes(" ") ? this.resourceName.split(" ").reduce((a, b) => a+b[0], "").toUpperCase() : this.resourceName;

        this.index = typeof attr.index !== "undefined" ? attr.index : layerIndex; // index of layer (it's better to don't change this)
        layerIndex++;

        this.upgrade = []; // define upgrade
        for (let i = 0; i < attr.upgradeCount; i++) this.upgrade.push(new Upgrade(this.index, this.upgrade.length)); // fill upgrades

        this.unlock = new LayerUnlock(attr.unlock || {}); // see class LayerUnlock
        
        this.difficultyMultiply = typeof attr.difficultyMultiply !== "undefined" ? attr.difficultyMultiply : 1;
        this.baseResourceGenerate = attr.baseResourceGenerate || new D(0);
    }

    

    getDifficulty() {
        return (getDifficulty() || generateConfig.difficulty)*this.difficultyMultiply;
    }
}

class Upgrade {
    constructor(layerIdx, upgradeIdx) {
        this.index = upgradeIdx;

        const innerSeed = generateConfig.seed+this.index**2;
        const upgradeTemple = upgradeVariety[innerSeed%(Math.min(upgradeVariety.length+3+this.index, upgradeVariety.length))];
        
        this.boost = upgradeTemple.boost(innerSeed, this.index);
        this.desc = upgradeTemple.desc;
        this.cost = undefined;
        this.boostType = upgradeTemple.boostType;
        this.boostTo = Object.keys(generateConfig.layers)[layerIdx ? innerSeed%layerIdx : 0];
    }
}

class LayerUnlock {
    constructor(attr={}) {
        this.when = attr.when || function(){return 1;}; // bool, when to unlock
        this.whenUnlocked = attr.whenUnlocked || function(){return 0;}; // do something when unlocked
    }
}

const upgradeVariety = [
    // 0
    {
        desc: `Multiply $Rescource gain by x$Boost`,
        boost: function(seed, index) {return new Function(`return new D(${seed}%6+4).pow(Math.pow(${index}+1, 0.4)).floor(0)`)},
        boostType: "mul"
    }
];
