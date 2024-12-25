const rollHandler = async ( dataSet, actor ) => {
    const rollData = actor.getRollData();
    const roll = new Roll(dataSet.roll, rollData);
    const result = await roll.evaluate();

    let pickedClass = 
    dataSet.label?.includes("Acrobatics") ? "eventide-acro-card" :
    dataSet.label?.includes("Physical") ? "eventide-phys-card" :
    dataSet.label?.includes("Fortitude") ? "eventide-fort-card" :
    dataSet.label?.includes("Will") ? "eventide-will-card" :
    dataSet.label?.includes("Wits") ? "eventide-wits-card" : "eventide-unknown-card";

    let label = dataSet.label ? `<h3 class="${pickedClass}">[ability] ${dataSet.label}</h3>` : '';

    console.log(rollData.cmax.value);
    console.log(result.terms[0].results[0].result);

    //style="color:white;background-color:#512DA8;text-align:center;padding-top:10px;padding-bottom:10px;font-size:1.25em;"
    //style="color:white;background-color:#8B0000;text-align:center;padding-top:10px;padding-bottom:10px;font-size:1.25em;"

    if (result.terms[0].results[0].result <= rollData.cmax.value && result.terms[0].results[0].result >= rollData.cmin.value) {
        label = `${label} <h3 class="eventide-critical-hit"><i class="fa-solid fa-meteor"></i> Critical Hit!</h3>`;
    } else if (result.terms[0].results[0].result === 1) {
        label = `${label} <h3 class="eventide-critical-miss"><i class="fa-solid fa-flag"></i> Critical Miss!</h3>`;
    }

    roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
    });

    return roll;
}

export {rollHandler};