let gameTick, createCache, toCreate, sessionData, simulateLoop, saveData;

function generateGame() {
    if (generateConfig.seed < 0 || generateConfig.seed > 1e10) generateConfig.seed = Math.floor(Math.random()*1e10);
    sessionData = {
        saveData: {}, // saveData
    
        contentUnlocked: 0,
        totalContents: 0,
        layers: {},
        timeSpent: 0, // total time spent on this game
        deltaTimeSpent: 0, // time spent without any progress
    }
    saveData = sessionData.saveData;
    saveData.layers = {};
    for (const layer in generateConfig.layers) {
        generateConfig.layers[layer] = new Layer(generateConfig.layers[layer]);
        sessionData.totalContents += generateConfig.layers[layer].upgrade.length;
        sessionData.layers[layer] = {};
        sessionData.layers[layer].upgrade = 0;

        saveData.layerUnlocked = 0;
        saveData.layers[layer] = {
            resource: new D(0),
            upgradeBought: []
        };
    }

    simulateLoop = setInterval(function(){if (!windowBlured) simulateGameTick()}, 10);
}

function simulateGameTick() {
    sessionData.timeSpent += generateConfig.speed;
    sessionData.deltaTimeSpent += generateConfig.speed;

    let layerResMult = {};
    for (const layer in generateConfig.layers) {
        layerResMult[layer] = new D(1);
        const thisLayer = generateConfig.layers[layer];
        const thisSave = saveData.layers[layer];

        for (let i = 0, l = thisLayer.upgrade.length; i < l; i++) {
            if (!thisSave.upgradeBought.includes(i) && typeof thisLayer.upgrade[i].cost !== "undefined" && thisSave.resource.gt(thisLayer.upgrade[i].cost)) {
                thisSave.resource = thisSave.resource.sub(thisLayer.upgrade[i].cost);
                thisSave.upgradeBought.push(i);
            }

            if (thisSave.upgradeBought.includes(i)) {
                layerResMult[layer] = layerResMult[layer][thisLayer.upgrade[i].boostType](thisLayer.upgrade[i].boost());
            }
        }

        const upgradeIdx = sessionData.layers[layer].upgrade;
        if (
            thisLayer.upgrade.length > sessionData.layers[layer].upgrade &&
            sessionData.deltaTimeSpent/1000 > thisLayer.getDifficulty()*(0.4+((generateConfig.seed+upgradeIdx**5)%24)/4)
        ) {
            thisSave.upgradeBought.push(upgradeIdx);
            thisLayer.upgrade[upgradeIdx].cost = new D(thisSave.resource);
            if (generateConfig.clearify) thisLayer.upgrade[upgradeIdx].cost = Spdl.clearify(thisLayer.upgrade[upgradeIdx].cost);
            thisSave.resource = thisSave.resource.sub(thisLayer.upgrade[upgradeIdx].cost);

            sessionData.deltaTimeSpent = 0;
            sessionData.contentUnlocked++;
            sessionData.layers[layer].upgrade++;
        }

        thisSave.resource = thisSave.resource.add(thisLayer.baseResourceGenerate.mul(layerResMult[layer]).mul(generateConfig.speed/1000));
    }
    displayGenerated();

    if (sessionData.totalContents == sessionData.contentUnlocked) {
        clearInterval(simulateLoop);
        document.getElementById("generateDisplay").innerHTML = "done!<br><br>turn into a html file isn't supported yet...";
    }
}

function displayGenerated() {
    let displayTxt = "";
    for (const layer in generateConfig.layers) {
        displayTxt += `You have ${notation(saveData.layers[layer].resource)} ${generateConfig.layers[layer].resourceName} (${generateConfig.layers[layer].shortResourceName})<br>`;
        displayTxt += `${sessionData.layers[layer].upgrade}/${generateConfig.layers[layer].upgrade.length} Upgrades generated so far...<br>`;
        displayTxt += "<br>";
    }
    document.getElementById("generateDisplay").innerHTML = displayTxt;
}

function getDifficulty() {
    return generateConfig.difficulty+sessionData.contentUnlocked*generateConfig.deltaDifficulty;
}