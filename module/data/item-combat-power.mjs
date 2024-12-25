export default class EventideRpSystemCombatPower extends EventideRpSystemItemBase {
    static defineSchema() {
        const fields = foundry.data.fields;
        const requiredInteger = { required: true, nullable: false, integer: true };
        const schema = super.defineSchema();

        schema.cost = new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 });
        
        schema.roll = new fields.SchemaField({
            diceNum: new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 }),
            diceSize: new fields.StringField({ initial: "d20" }),
            diceBonus: new fields.StringField({ initial: "+@will.mod" })
        })

        schema.formula = new fields.StringField({ blank: true });

        return schema;
    }

    prepareDerivedData() {
        // Build the formula dynamically using string interpolation
        const roll = this.roll;

        if (roll.diceNum === 0) // If diceNum is 0 it means it's a flat bonus
            this.formula = `${roll.diceSize}${roll.diceBonus}`
        else
            this.formula = `${roll.diceNum}${roll.diceSize}${roll.diceBonus}`
    }
}