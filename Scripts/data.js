let generateConfig = {
    gameName: "basicIncremental",
    layers: {
        basic: {
            name: "Basic",
            upgradeCount: 100,
            baseResourceGenerate: new D(1)
        },
        /*advenced: {
            unlockesAt: () => {saveData.layers.basic.upgrades.length >= 50},
            upgrades: 10
        }*/
    }, // data of layers
    contents: 0, //
    difficulty: 3, // this is affect to progress speed (highter -> longer)
    deltaDifficulty: 0.2, // difficulty increases over progress (def. difficulty += deltaDifficulty)
    seed: -1, // seed, -1 to random (0 ~ 1e10)
    speed: 100, // generate speed in ms/loop, increasing this will cause quality down
    clearify: true, // make generated values clear. ex) 1.2345e8324 -> 1.2e8324
}

let gameData = {};

let layerIndex = 0;
class Layer {
    constructor(attr={}) {
        this.name = attr.name || "Basic";
        this.index = typeof attr.index !== "undefined" ? attr.index : layerIndex;
        layerIndex++;
        this.upgrade = [];
        for (let i = 0; i < attr.upgradeCount; i++) this.upgrade.push(this.generateUpgrade());
        this.diffMult = typeof attr.diffMult !== "undefined" ? attr.diffMult : 1;
        this.baseResourceGenerate = attr.baseResourceGenerate || new D(0);
        this.resourceName = this.resourceName || attr.name + " Point";
        this.shortResourceName = this.resourceName.includes(" ") ? this.resourceName.split(" ").reduce((a, b) => a+b[0], "").toUpperCase() : this.resourceName;
    }

    generateUpgrade() {
        const index = this.upgrade.length;
        const innerSeed = generateConfig.seed+index**2;
        const boost = new D(innerSeed%6+4).pow(Math.pow(index+1, 0.4)).floor(0);
        return {
            index: index+1,
            boost: boost,
            desc: `Multiply ${generateConfig.layers.shortResourceName} gain by ${notation(boost, 2, 0)}`,
            cost: undefined,
            boostType: "mul",
            boostTo: "basic"
        };
    }
}

