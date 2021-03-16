let gameTick, createCache, toCreate, sessionData, simulateLoop, saveData;

function generateGame() {
    if (generateConfig.seed < 0 || generateConfig.seed > 1e10) generateConfig.seed = Math.floor(Math.random()*1e10);
    sessionData = {
        saveData: {}, // saveData
    
        contentUnlocked: 0,
        timeSpent: 0, // total time spent on this game
        deltaTimeSpent: 0, // time spent without any progress
    }
    saveData = sessionData.saveData;
    saveData.layers = {};
    for (const layer in generateConfig.layers) {
        generateConfig.layers[layer] = new Layer(generateConfig.layers[layer]);

        saveData.layers[layer] = {
            resource: new D(0),
            upgradeBought: []
        };
    }

    simulateLoop = setInterval(function(){if (!windowBlured) simulateGameTick()}, 1);
}

function simulateGameTick() {
    sessionData.timeSpent += generateConfig.speed;
    sessionData.deltaTimeSpent += generateConfig.speed;

    let layerResMult = {};
    let unlockOrderBool = true;
    for (const layer in generateConfig.layers) {
        layerResMult[layer] = new D(1);
        for (let i = 0, l = generateConfig.layers[layer].upgrade.length; i < l; i++) {
            if (typeof generateConfig.layers[layer].upgrade[i].cost === "undefined" && unlockOrderBool) {
                unlockOrderBool = false;
                if (sessionData.deltaTimeSpent/1000 > getDifficulty()*(0.5+((generateConfig.seed+i**5)%8)/4)) {
                    sessionData.deltaTimeSpent = 0;
                    saveData.layers[layer].upgradeBought.push(i);
                    generateConfig.layers[layer].upgrade[i].cost = new D(saveData.layers[layer].resource);
                    if (generateConfig.clearify) generateConfig.layers[layer].upgrade[i].cost = Spdl.clearify(generateConfig.layers[layer].upgrade[i].cost);
                    saveData.layers[layer].resource = saveData.layers[layer].resource.sub(generateConfig.layers[layer].upgrade[i].cost);
                    sessionData.contentUnlocked++;
                }
            }

            if (saveData.layers[layer].upgradeBought.includes(i)) {
                layerResMult[layer] = layerResMult[layer][generateConfig.layers[layer].upgrade[i].boostType](generateConfig.layers[layer].upgrade[i].boost);
            }
        }
        saveData.layers[layer].resource = saveData.layers[layer].resource.add(generateConfig.layers[layer].baseResourceGenerate.mul(layerResMult[layer]).mul(generateConfig.speed/1000));
    }
    displayGenerated();
}

function displayGenerated() {
    let displayTxt = "";
    for (const layer in generateConfig.layers) {
        displayTxt += `You have ${notation(saveData.layers[layer].resource)} ${generateConfig.layers[layer].resourceName} (${generateConfig.layers[layer].shortResourceName})<br>`;
        displayTxt += `${sessionData.contentUnlocked}/${generateConfig.layers[layer].upgrade.length} Upgrades generated so far...<br>`;
        displayTxt += "<br>";
    }
    document.getElementById("generateDisplay").innerHTML = displayTxt;
}

function getDifficulty() {
    return generateConfig.difficulty+sessionData.contentUnlocked*generateConfig.deltaDifficulty;
}