const { HTMLField, NumberField, SchemaField, StringField } =
  foundry.data.fields;

/* -------------------------------------------- */
/*  Actor Models                                */
/* -------------------------------------------- */

// This thing is going to probably go given the files I got from the boilerplate thing.

class ActorDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    // All Actors have resources.
    return {
      resources: new SchemaField({
        resolve: new SchemaField({
          min: new NumberField({
            required: true,
            integer: true,
            min: 0,
            initial: 0,
          }),
          value: new NumberField({
            required: true,
            integer: true,
            min: 0,
            initial: 10,
          }),
          max: new NumberField({
            required: true,
            integer: true,
            min: 0,
            initial: 10,
          }),
        }),
        power: new SchemaField({
          min: new NumberField({
            required: true,
            integer: true,
            min: 0,
            initial: 0,
          }),
          value: new NumberField({
            required: true,
            integer: true,
            min: 0,
            initial: 1,
          }),
          max: new NumberField({
            required: true,
            integer: true,
            min: 0,
            initial: 3,
          }),
        }),
      }),
      image: new FilePathField({
        required: true,
        blank: true,
        initial: [""],
      }),
      attributes: new SchemaField({
        acrobatics: new NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 0,
        }),
        athletics: new NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 0,
        }),
        fortitude: new NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 0,
        }),
        will: new NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 0,
        }),
        intelligence: new NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 0,
        }),
        dice: new NumberField({
          required: true,
          integer: true,
          min: 1,
          initial: 20,
        }),
        critLower: new NumberField({
          required: true,
          integer: true,
          min: 1,
          initial: 20,
        }),
        critUpper: new NumberField({
          required: true,
          integer: true,
          min: 1,
          initial: 20,
        }),
      }),
    };
  }
}

class ImportantActorDataModel extends ActorDataModel {
  static defineSchema() {
    // Only important Actors have a background.
    return {
      ...super.defineSchema(),
      background: new SchemaField({
        biography: new HTMLField({ required: true, blank: true }),
      }),
    };
  }
}

export class HeroDataModel extends ImportantActorDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      level: new NumberField({
        required: true,
        integer: true,
        min: 0,
        initial: 0,
        max: 30,
      }),
    };
  }
}

// Currently there is no difference between VillainDataModel and ImportantActorDataModel
// but if that ever changes this will be here.
export class VillainDataModel extends ImportantActorDataModel {}

// The pawn does not have any different data to the base ActorDataModel, but we
// still define a data model for it, in case we have any special logic we want
// to perform only for pawns.
export class PawnDataModel extends ActorDataModel {}

/* -------------------------------------------- */
/*  Condition Models                            */
/* -------------------------------------------- */

class ConditionDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      name: new StringField({
        required: true,
        blank: false,
      }),
      duration: new NumberField({
        required: true,
        integer: true,
        min: 0,
        initial: 0,
      }),
    };
  }
}

// Stat Conditions will be based on this class: they always have to do
// with stats
class StatDataModel extends ConditionDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      attributes: new SchemaField({
        acrobatics: new NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 0,
        }),
        athletics: new NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 0,
        }),
        fortitude: new NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 0,
        }),
        will: new NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 0,
        }),
        intelligence: new NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 0,
        }),
      }),
    };
  }
}

export class BoonDataModel extends StatDataModel {}

export class BaneDataModel extends StatDataModel {}

export class DCDataModel extends StatDataModel {}

// This is what dice conditions will be based on
class DiceConditionDataModel extends ConditionDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      change: new NumberField({
        required: true,
        integer: true,
        initial: 0,
      }),
    };
  }
}

export class ChangeDiceDataModel extends DiceConditionDataModel {}

export class CriticalMinimumDataModel extends DiceConditionDataModel {}

export class CriticalMaximumDataModel extends DiceConditionDataModel {}

/* -------------------------------------------- */
/*  Item Models                                 */
/* -------------------------------------------- */

class ItemDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      rarity: new StringField({
        required: true,
        blank: false,
        options: ["common", "uncommon", "rare", "legendary"],
        initial: "common",
      }),
      price: new NumberField({
        required: true,
        integer: true,
        min: 0,
        initial: 20,
      }),
      action: new StringField({
        required: true,
        blank: false,
        options: [
          "free",
          "reaction",
          "movement",
          "standard",
          "full-round",
          "preparation",
        ],
        initial: "standard",
      }),
    };
  }
}

export class WeaponDataModel extends ItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      damage: new NumberField({
        required: true,
        integer: true,
        positive: true,
        initial: 5,
      }),
    };
  }
}

export class SpellDataModel extends ItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      cost: new NumberField({
        required: true,
        integer: true,
        positive: true,
        initial: 1,
      }),
    };
  }
}
