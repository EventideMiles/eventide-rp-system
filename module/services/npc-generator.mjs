import { Logger } from "./logger.mjs";

const ABILITY_KEYS = ["acro", "phys", "fort", "will", "wits"];

const ARCHETYPES = {
  balanced: { acro: 1, phys: 1, fort: 1, will: 1, wits: 1 },
  warrior: { acro: 2, phys: 4, fort: 4, will: 1, wits: 1 },
  spellcaster: { acro: 1, phys: 1, fort: 2, will: 4, wits: 4 },
  skirmisher: { acro: 4, phys: 2, fort: 2, will: 1, wits: 4 },
  brute: { acro: 1, phys: 5, fort: 5, will: 1, wits: 1 },
  defender: { acro: 2, phys: 2, fort: 5, will: 3, wits: 1 },
};

const FALLBACK_STAT_FORMULA = "14 + (2 * @lvl.value)";

export class NpcGenerator {
  static ARCHETYPES = ARCHETYPES;
  static ABILITY_KEYS = ABILITY_KEYS;
  static SYSTEM_COMPENDIUM = "eventide-rp-system.erps-npc-templates";
  static SETTING_KEY = "npcTemplateCompendium";

  static distributeStats(level, weights) {
    const budget = this.calculateStatBudget(level);
    if (budget <= 0) return this._defaultDistribution(level);

    const weightValues = ABILITY_KEYS.map((key) => weights[key] ?? 1);
    const weightSum = weightValues.reduce((sum, w) => sum + w, 0);
    if (weightSum <= 0) return this._defaultDistribution(level);

    const rawAllocations = weightValues.map((w) => budget * (w / weightSum));
    const allocated = rawAllocations.map((raw) => Math.max(1, Math.round(raw)));

    const currentSum = allocated.reduce((sum, v) => sum + v, 0);
    const remainder = budget - currentSum;

    if (remainder !== 0) {
      const fractionalParts = rawAllocations.map((raw, i) => ({
        index: i,
        frac: raw - Math.floor(raw),
        current: allocated[i],
      }));

      if (remainder > 0) {
        fractionalParts.sort((a, b) => b.frac - a.frac);
        for (let i = 0; i < remainder; i++) {
          allocated[fractionalParts[i].index]++;
        }
      } else {
        fractionalParts.sort((a, b) => a.frac - b.frac);
        for (let i = 0; i < Math.abs(remainder); i++) {
          if (allocated[fractionalParts[i].index] > 1) {
            allocated[fractionalParts[i].index]--;
          }
        }
      }
    }

    const result = {};
    ABILITY_KEYS.forEach((key, i) => {
      result[key] = allocated[i];
    });

    return result;
  }

  static calculateStatBudget(level) {
    try {
      const formula =
        game.settings?.get("eventide-rp-system", "statPointsFormula") ||
        FALLBACK_STAT_FORMULA;
      const sanitized = formula.trim();
      if (!sanitized || sanitized === "0") {
        return this._fallbackBudget(level);
      }
      const rollData = { lvl: { value: level } };
      const roll = new Roll(sanitized, rollData);
      const result = roll.evaluateSync();
      const budget = Math.floor(result.total);
      return budget > 0 ? budget : this._fallbackBudget(level);
    } catch {
      return this._fallbackBudget(level);
    }
  }

  static evaluateFormula(formulaKey, abilities, level) {
    try {
      const formulaSetting = game.settings?.get(
        "eventide-rp-system",
        formulaKey,
      );
      if (!formulaSetting || formulaSetting.trim() === "") return null;

      const rollData = {
        lvl: { value: level },
        ...Object.fromEntries(
          ABILITY_KEYS.map((key) => [key, { total: abilities[key] }]),
        ),
      };

      const roll = new Roll(formulaSetting, rollData);
      const result = roll.evaluateSync();
      return Math.max(0, Math.floor(result.total));
    } catch {
      return null;
    }
  }

  static buildActorData({ level, abilities, name, img }) {
    const resolveMax = this.evaluateFormula(
      "maxResolveFormula",
      abilities,
      level,
    );
    const powerMax = this.evaluateFormula("maxPowerFormula", abilities, level);

    const abilityData = {};
    for (const key of ABILITY_KEYS) {
      abilityData[key] = { value: abilities[key] };
    }

    const actorData = {
      name: name || `NPC Level ${level}`,
      type: "npc",
      system: {
        attributes: { level: { value: level } },
        cr: level,
        abilities: abilityData,
        resolve: {
          value: resolveMax ?? 10,
          max: resolveMax ?? 10,
        },
        power: {
          value: powerMax ?? 1,
          max: powerMax ?? 1,
        },
        biography: "",
        gmNotes: "",
      },
    };

    if (img) {
      actorData.img = img;
    }

    return { actorData, resolveMax, powerMax };
  }

  static buildOverrideFeature({ resolveOverride, powerOverride, level }) {
    const changes = [];
    const descriptionParts = [];

    if (resolveOverride != null && !isNaN(resolveOverride)) {
      changes.push({
        key: "system.resolve.override",
        type: "override",
        phase: "initial",
        value: resolveOverride,
      });
      descriptionParts.push(`Resolve ${resolveOverride}`);
    }

    if (powerOverride != null && !isNaN(powerOverride)) {
      changes.push({
        key: "system.power.override",
        type: "override",
        phase: "initial",
        value: powerOverride,
      });
      descriptionParts.push(`Power ${powerOverride}`);
    }

    if (changes.length === 0) return null;

    const description = game.i18n.format(
      "EVENTIDE_RP_SYSTEM.NpcGenerator.OverrideFeatureDescription",
      {
        level,
        overrides: descriptionParts.join(", "),
      },
    );

    return {
      name: game.i18n.localize(
        "EVENTIDE_RP_SYSTEM.NpcGenerator.OverrideFeatureName",
      ),
      type: "feature",
      img: "icons/svg/stoned.svg",
      system: {
        description,
        bgColor: "#4a5568",
        textColor: "#ffffff",
        targeted: false,
        active: true,
        roll: {
          type: "none",
          ability: "unaugmented",
          bonus: 0,
          diceAdjustments: {
            advantage: 0,
            disadvantage: 0,
          },
        },
      },
      effects: [
        {
          _id: foundry.utils.randomID(),
          name: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.NpcGenerator.OverrideFeatureName",
          ),
          img: "icons/svg/stoned.svg",
          type: "base",
          system: { changes },
          disabled: false,
          showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.NEVER,
          transfer: true,
          statuses: [],
          flags: {},
          tint: "#ffffff",
        },
      ],
    };
  }

  static async getAvailableTemplates() {
    const templates = [];

    for (const [key, weights] of Object.entries(ARCHETYPES)) {
      templates.push({
        id: `archetype:${key}`,
        name: game.i18n.localize(
          `EVENTIDE_RP_SYSTEM.NpcGenerator.Archetype${key.charAt(0).toUpperCase() + key.slice(1)}`,
        ),
        img: "icons/svg/statue-skull.svg",
        source: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.NpcGenerator.BuiltInArchetypes",
        ),
        isArchetype: true,
        archetypeKey: key,
        weights,
      });
    }

    const systemPack = game.packs.get(this.SYSTEM_COMPENDIUM);
    if (systemPack) {
      try {
        const index = await systemPack.getIndex();
        for (const entry of index) {
          if (entry.type === "npc") {
            templates.push({
              id: `system:${entry._id}`,
              uuid: `Compendium.${systemPack.collection}.${entry._id}`,
              name: entry.name,
              img: entry.img || "icons/svg/statue-skull.svg",
              source: systemPack.metadata.label,
              isCompendium: true,
              packId: systemPack.collection,
            });
          }
        }
      } catch {
        Logger.warn("Failed to load system NPC templates compendium");
      }
    }

    const userPackId = game.settings?.get(
      "eventide-rp-system",
      this.SETTING_KEY,
    );
    if (userPackId) {
      const userPack = game.packs.get(userPackId);
      if (userPack) {
        try {
          const index = await userPack.getIndex();
          for (const entry of index) {
            if (entry.type === "npc") {
              const existingIdx = templates.findIndex(
                (t) => t.name === entry.name,
              );
              if (existingIdx !== -1) {
                templates.splice(existingIdx, 1);
              }

              templates.push({
                id: `user:${entry._id}`,
                uuid: `Compendium.${userPack.collection}.${entry._id}`,
                name: entry.name,
                img: entry.img || "icons/svg/statue-skull.svg",
                source: userPack.metadata.label,
                isCompendium: true,
                packId: userPack.collection,
                isUserPack: true,
              });
            }
          }
        } catch {
          Logger.warn(
            `Failed to load user NPC template compendium: ${userPackId}`,
          );
        }
      }
    }

    return templates;
  }

  static async getTemplateWeights(templateId) {
    if (templateId.startsWith("archetype:")) {
      const key = templateId.replace("archetype:", "");
      return { ...ARCHETYPES[key] };
    }

    const doc = await this._loadCompendiumTemplate(templateId);
    if (!doc) return null;

    const weights = {};
    for (const key of ABILITY_KEYS) {
      weights[key] = doc.system?.abilities?.[key]?.value ?? 1;
    }
    return weights;
  }

  static async generateNPC({
    level,
    template,
    name,
    img,
    resolveOverride,
    powerOverride,
  }) {
    if (!game.user.isGM) {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.GMOnlyOperation"),
      );
      return null;
    }

    let abilities;
    let templateWeights = null;

    if (typeof template === "string") {
      if (template.startsWith("archetype:")) {
        const key = template.replace("archetype:", "");
        templateWeights = { ...ARCHETYPES[key] };
        abilities = this.distributeStats(level, templateWeights);
      } else {
        const templateData = await this._loadCompendiumTemplate(template);
        if (templateData) {
          templateWeights = {};
          for (const key of ABILITY_KEYS) {
            templateWeights[key] =
              templateData.system?.abilities?.[key]?.value ?? 1;
          }
          abilities = this.distributeStats(level, templateWeights);
          if (!name) name = templateData.name;
          if (!img) img = templateData.img;
        } else {
          templateWeights = { ...ARCHETYPES.balanced };
          abilities = this.distributeStats(level, templateWeights);
        }
      }
    } else if (typeof template === "object" && template !== null) {
      templateWeights = template;
      abilities = this.distributeStats(level, templateWeights);
    } else {
      templateWeights = { ...ARCHETYPES.balanced };
      abilities = this.distributeStats(level, templateWeights);
    }

    const { actorData, resolveMax, powerMax } = this.buildActorData({
      level,
      abilities,
      name,
      img,
    });

    const createdActor = await Actor.create(actorData);
    if (!createdActor) {
      Logger.error("Failed to create NPC actor", null, "NPC_GENERATOR");
      return null;
    }

    await createdActor.update({
      "prototypeToken.actorLink": true,
      "prototypeToken.displayName": 50,
    });

    await createdActor.setFlag("eventide-rp-system", "autoTokenUpdate", true);
    await createdActor.setFlag("eventide-rp-system", "autoTokenSync", true);

    const overrideFeature = this.buildOverrideFeature({
      resolveOverride,
      powerOverride,
      level,
    });

    if (overrideFeature) {
      await createdActor.createEmbeddedDocuments("Item", [overrideFeature]);
    }

    Logger.info(
      `NPC "${createdActor.name}" created at level ${level}`,
      { abilities, resolveMax, powerMax },
      "NPC_GENERATOR",
    );

    return createdActor;
  }

  static async applyToActor(
    actor,
    { level, abilities, resolveOverride, powerOverride },
  ) {
    if (!game.user.isGM) {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.GMOnlyOperation"),
      );
      return null;
    }

    if (!actor || actor.type !== "npc") {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.NpcGenerator.MustBeNpc"),
      );
      return null;
    }

    const resolveMax = this.evaluateFormula(
      "maxResolveFormula",
      abilities,
      level,
    );
    const powerMax = this.evaluateFormula("maxPowerFormula", abilities, level);

    const updateData = {
      "system.attributes.level.value": level,
      "system.cr": level,
    };

    for (const key of ABILITY_KEYS) {
      updateData[`system.abilities.${key}.value`] = abilities[key];
    }

    if (resolveMax != null) {
      updateData["system.resolve.max"] = resolveMax;
      updateData["system.resolve.value"] = resolveMax;
    }

    if (powerMax != null) {
      updateData["system.power.max"] = powerMax;
      updateData["system.power.value"] = powerMax;
    }

    await actor.update(updateData);

    await actor.update({
      "prototypeToken.actorLink": true,
      "prototypeToken.displayName": 50,
    });

    await actor.setFlag("eventide-rp-system", "autoTokenUpdate", true);
    await actor.setFlag("eventide-rp-system", "autoTokenSync", true);

    const existingOverride = actor.items.find(
      (item) =>
        item.type === "feature" &&
        item.name ===
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.NpcGenerator.OverrideFeatureName",
          ),
    );

    if (existingOverride) {
      await existingOverride.delete();
    }

    const overrideFeature = this.buildOverrideFeature({
      resolveOverride,
      powerOverride,
      level,
    });

    if (overrideFeature) {
      await actor.createEmbeddedDocuments("Item", [overrideFeature]);
    }

    Logger.info(
      `NPC "${actor.name}" updated at level ${level}`,
      { abilities, resolveMax, powerMax },
      "NPC_GENERATOR",
    );

    return actor;
  }

  static getAvailableCompendiums() {
    const packs = [];
    for (const pack of game.packs) {
      if (pack.documentName === "Actor") {
        packs.push({
          id: pack.collection,
          label: pack.metadata.label,
        });
      }
    }
    return packs.sort((a, b) => a.label.localeCompare(b.label));
  }

  static _defaultDistribution(level) {
    const budget = this._fallbackBudget(level);
    const perAbility = Math.floor(budget / ABILITY_KEYS.length);
    const remainder = budget - perAbility * ABILITY_KEYS.length;

    const result = {};
    ABILITY_KEYS.forEach((key, i) => {
      result[key] = perAbility + (i < remainder ? 1 : 0);
    });
    return result;
  }

  static _fallbackBudget(level) {
    try {
      const roll = new Roll(FALLBACK_STAT_FORMULA, { lvl: { value: level } });
      const result = roll.evaluateSync();
      return Math.max(5, Math.floor(result.total));
    } catch {
      return 14 + 2 * level;
    }
  }

  static async _loadCompendiumTemplate(templateId) {
    let packId;
    let docId;

    if (templateId.startsWith("system:")) {
      docId = templateId.replace("system:", "");
      packId = this.SYSTEM_COMPENDIUM;
    } else if (templateId.startsWith("user:")) {
      docId = templateId.replace("user:", "");
      packId = game.settings?.get("eventide-rp-system", this.SETTING_KEY);
      if (!packId) return null;
    } else {
      return null;
    }

    const pack = game.packs.get(packId);
    if (!pack) return null;

    try {
      const doc = await pack.getDocument(docId);
      return doc;
    } catch {
      Logger.warn(
        `Failed to load template document: ${templateId}`,
        null,
        "NPC_GENERATOR",
      );
      return null;
    }
  }
}
