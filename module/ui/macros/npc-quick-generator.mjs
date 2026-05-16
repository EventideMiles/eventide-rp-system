import { EventideSheetHelpers } from "../components/_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  applyThemeImmediate,
  cleanupThemeManager,
} from "../../helpers/_module.mjs";
import { Logger, NpcGenerator } from "../../services/_module.mjs";

const ABILITY_KEYS = ["acro", "phys", "fort", "will", "wits"];
const ABILITY_LABELS = {
  acro: "EVENTIDE_RP_SYSTEM.NpcGenerator.Abilities.Acro",
  phys: "EVENTIDE_RP_SYSTEM.NpcGenerator.Abilities.Phys",
  fort: "EVENTIDE_RP_SYSTEM.NpcGenerator.Abilities.Fort",
  will: "EVENTIDE_RP_SYSTEM.NpcGenerator.Abilities.Will",
  wits: "EVENTIDE_RP_SYSTEM.NpcGenerator.Abilities.Wits",
};

export class NpcQuickGenerator extends EventideSheetHelpers {
  static PARTS = {
    npcQuickGenerator: {
      template: "systems/eventide-rp-system/templates/macros/npc-quick-generator.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    id: "npc-quick-generator",
    classes: [
      "eventide-sheet",
      "eventide-sheet--scrollbars",
      "npc-quick-generator",
    ],
    position: {
      width: 620,
      height: "auto",
    },
    tag: "form",
    window: {
      icon: "fa-solid fa-wand-magic-sparkles",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      decrementLevel: this._onDecrementLevel,
      incrementLevel: this._onIncrementLevel,
      decrementAbility: this._onDecrementAbility,
      incrementAbility: this._onIncrementAbility,
      autoDistribute: this._onAutoDistribute,
      toggleOverrideResolve: this._onToggleOverrideResolve,
      toggleOverridePower: this._onToggleOverridePower,
    },
  };

  get title() {
    return game.i18n.localize("EVENTIDE_RP_SYSTEM.NpcGenerator.Title");
  }

  constructor(options = {}) {
    super();
    this._sourceActor = options.sourceActor || null;
    this._distributionMode = "template";
    this._level = options.sourceActor?.system?.attributes?.level?.value ?? 1;
    this._selectedTemplateId = "";
    this._abilities = { acro: 1, phys: 1, fort: 1, will: 1, wits: 1 };
    this._overrideResolveEnabled = false;
    this._overridePowerEnabled = false;
    this._overrideResolveValue = 10;
    this._overridePowerValue = 1;
    this._npcName = options.sourceActor?.name || "";
    this._templates = [];
    this._templateGroups = [];
    this._statBudget = 0;
    this._budgetRemaining = 0;
    this._derivedResolve = "—";
    this._derivedPower = "—";
    this._derivedAC = "—";
  }

  async _prepareContext(_options) {
    await EventideSheetHelpers._gmCheck();

    const context = await super._prepareContext(_options);

    this._templates = await NpcGenerator.getAvailableTemplates();
    this._templateGroups = this._buildTemplateGroups();

    this._recalculate();

    context.distributionMode = this._distributionMode;
    context.level = this._level;
    context.statBudget = this._statBudget;
    context.budgetRemaining = this._budgetRemaining;
    context.abilities = this._buildAbilitiesContext();
    context.derivedResolve = this._derivedResolve;
    context.derivedPower = this._derivedPower;
    context.derivedAC = this._derivedAC;
    context.overrideResolveEnabled = this._overrideResolveEnabled;
    context.overridePowerEnabled = this._overridePowerEnabled;
    context.overrideResolveValue = this._overrideResolveValue;
    context.overridePowerValue = this._overridePowerValue;
    context.npcName = this._npcName;
    context.templateGroups = this._templateGroups;
    context.isApplyMode = !!this._sourceActor;

    context.callouts = [
      {
        type: "information",
        faIcon: "fas fa-info-circle",
        text: this._sourceActor
          ? game.i18n.format("EVENTIDE_RP_SYSTEM.NpcGenerator.CalloutApply", {
              name: this._sourceActor.name,
            })
          : game.i18n.localize("EVENTIDE_RP_SYSTEM.NpcGenerator.CalloutCreate"),
      },
    ];

    context.footerButtons = [
      this._sourceActor
        ? {
            label: game.i18n.localize("EVENTIDE_RP_SYSTEM.NpcGenerator.ApplyToExisting"),
            type: "submit",
            cssClass: "erps-button erps-button--primary",
            name: "apply",
          }
        : null,
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.NpcGenerator.Generate"),
        type: "submit",
        cssClass: "erps-button erps-button--primary",
        name: "generate",
      },
    ].filter(Boolean);

    return context;
  }

  async _onChangeForm(formConfig, event) {
    const target = event.target;
    if (!target || !target.name) return super._onChangeForm(formConfig, event);

    await super._onChangeForm(formConfig, event);

    let needsRender = false;

    switch (target.name) {
      case "distributionMode":
        if (target.value !== this._distributionMode) {
          this._distributionMode = target.value;
          needsRender = true;
        }
        break;

      case "level": {
        const val = parseInt(target.value, 10);
        if (!isNaN(val) && val >= 1 && val !== this._level) {
          this._level = val;
          needsRender = true;
        }
        break;
      }

      case "templateId":
        if (target.value !== this._selectedTemplateId) {
          this._selectedTemplateId = target.value;
          if (this._selectedTemplateId) {
            this._distributionMode = "template";
            const weights = this._getTemplateWeights();
            if (weights) {
              this._abilities = NpcGenerator.distributeStats(this._level, weights);
            }
            const template = this._templates.find(
              (t) => t.id === this._selectedTemplateId,
            );
            if (template && !this._npcName) {
              this._npcName = template.name;
            }
          }
          needsRender = true;
        }
        break;

      case "npcName":
        this._npcName = target.value;
        break;

      default: {
        if (target.name.startsWith("ability-") && this._distributionMode === "custom") {
          const ability = target.name.replace("ability-", "");
          const val = parseInt(target.value, 10);
          if (ABILITY_KEYS.includes(ability) && !isNaN(val) && val >= 1) {
            this._abilities[ability] = val;
            needsRender = true;
          }
        } else if (target.name.startsWith("slider-") && this._distributionMode === "custom") {
          const ability = target.name.replace("slider-", "");
          const val = parseInt(target.value, 10);
          if (ABILITY_KEYS.includes(ability) && !isNaN(val) && val >= 1) {
            this._abilities[ability] = val;
            needsRender = true;
          }
        }

        if (target.name === "overrideResolveValue") {
          const val = parseInt(target.value, 10);
          if (!isNaN(val)) this._overrideResolveValue = val;
        } else if (target.name === "overridePowerValue") {
          const val = parseInt(target.value, 10);
          if (!isNaN(val)) this._overridePowerValue = val;
        }
        break;
      }
    }

    if (needsRender) {
      this._recalculate();
      await this.render();
    }
  }

  _recalculate() {
    this._statBudget = NpcGenerator.calculateStatBudget(this._level);

    if (this._distributionMode === "template" && this._selectedTemplateId) {
      const weights = this._getTemplateWeights();
      if (weights) {
        this._abilities = NpcGenerator.distributeStats(this._level, weights);
      }
    }

    this._budgetRemaining = this._calculateBudgetRemaining();
    this._derivedResolve = NpcGenerator.evaluateFormula(
      "maxResolveFormula",
      this._abilities,
      this._level,
    ) ?? "—";
    this._derivedPower = NpcGenerator.evaluateFormula(
      "maxPowerFormula",
      this._abilities,
      this._level,
    ) ?? "—";

    const totalAbilityScore = ABILITY_KEYS.reduce(
      (sum, key) => sum + (this._abilities[key] || 0),
      0,
    );
    this._derivedAC = totalAbilityScore > 0
      ? Math.max(...ABILITY_KEYS.map((key) => (this._abilities[key] || 0) + 11))
      : "—";
  }

  _calculateBudgetRemaining() {
    if (this._distributionMode !== "custom") return 0;
    const total = ABILITY_KEYS.reduce(
      (sum, key) => sum + (this._abilities[key] || 0),
      0,
    );
    return this._statBudget - total;
  }

  _buildAbilitiesContext() {
    return ABILITY_KEYS.map((key) => ({
      key,
      label: ABILITY_LABELS[key],
      value: this._abilities[key] || 1,
      ac: (this._abilities[key] || 0) + 11,
    }));
  }

  _buildTemplateGroups() {
    const groups = [];

    const builtIn = this._templates.filter((t) => t.isArchetype);
    if (builtIn.length > 0) {
      groups.push({
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.NpcGenerator.BuiltInArchetypes"),
        templates: builtIn.map((t) => ({
          ...t,
          selected: t.id === this._selectedTemplateId,
        })),
      });
    }

    const systemTemplates = this._templates.filter(
      (t) => t.isCompendium && !t.isUserPack,
    );
    if (systemTemplates.length > 0) {
      groups.push({
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.NpcGenerator.CompendiumTemplates"),
        templates: systemTemplates.map((t) => ({
          ...t,
          selected: t.id === this._selectedTemplateId,
        })),
      });
    }

    const userTemplates = this._templates.filter((t) => t.isUserPack);
    if (userTemplates.length > 0) {
      groups.push({
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.NpcGenerator.UserTemplates"),
        templates: userTemplates.map((t) => ({
          ...t,
          selected: t.id === this._selectedTemplateId,
        })),
      });
    }

    return groups;
  }

  _getTemplateWeights() {
    if (!this._selectedTemplateId) return null;

    if (this._selectedTemplateId.startsWith("archetype:")) {
      const key = this._selectedTemplateId.replace("archetype:", "");
      return { ...NpcGenerator.ARCHETYPES[key] };
    }

    const template = this._templates.find((t) => t.id === this._selectedTemplateId);
    if (template?.weights) {
      return { ...template.weights };
    }

    return null;
  }

  async _onRender(_context, _options) {
    super._onRender(_context, _options);
    if (this.themeManager) {
      this.themeManager.applyThemes();
    }
  }

  async _onFirstRender() {
    super._onFirstRender();
    applyThemeImmediate(this.element);

    if (!this.themeManager) {
      initThemeManager(this, THEME_PRESETS.CREATOR_APPLICATION)
        .then((manager) => {
          this.themeManager = manager;
        })
        .catch((error) => {
          Logger.error(
            "Failed to initialize theme manager for NPC Quick Generator",
            error,
            "THEME",
          );
        });
    }
  }

  async _preClose(options) {
    if (this.themeManager) {
      cleanupThemeManager(this);
      this.themeManager = null;
    }
    if (this.element) {
      erps.utils.cleanupNumberInputs(this.element);
    }
    await super._preClose(options);
  }

  static _onDecrementLevel() {
    if (this._level > 1) {
      this._level--;
      this._recalculate();
      this.render();
    }
  }

  static _onIncrementLevel() {
    this._level++;
    this._recalculate();
    this.render();
  }

  static _onDecrementAbility(event, target) {
    const ability = target.dataset.ability;
    if (ability && (this._abilities[ability] || 1) > 1) {
      this._abilities[ability] = (this._abilities[ability] || 1) - 1;
      this._recalculate();
      this.render();
    }
  }

  static _onIncrementAbility(event, target) {
    const ability = target.dataset.ability;
    if (ability) {
      this._abilities[ability] = (this._abilities[ability] || 1) + 1;
      this._recalculate();
      this.render();
    }
  }

  static _onAutoDistribute() {
    const weights = NpcGenerator.ARCHETYPES.balanced;
    this._abilities = NpcGenerator.distributeStats(this._level, weights);
    this._recalculate();
    this.render();
  }

  static _onToggleOverrideResolve(event, target) {
    this._overrideResolveEnabled = target.checked;
    this._recalculate();
    this.render();
  }

  static _onToggleOverridePower(event, target) {
    this._overridePowerEnabled = target.checked;
    this._recalculate();
    this.render();
  }

  static async #onSubmit(event, form, formData) {
    const level = parseInt(formData.get("level"), 10) || 1;
    const distributionMode = formData.get("distributionMode") || "template";
    const templateId = formData.get("templateId") || "";
    const npcName = formData.get("npcName")?.trim() || "";

    const abilities = {};
    for (const key of ABILITY_KEYS) {
      abilities[key] = parseInt(formData.get(`ability-${key}`), 10) || 1;
    }

    const overrideResolveEnabled =
      form.querySelector("#overrideResolveEnabled")?.checked ?? false;
    const overridePowerEnabled =
      form.querySelector("#overridePowerEnabled")?.checked ?? false;
    const overrideResolve = overrideResolveEnabled
      ? parseInt(formData.get("overrideResolveValue"), 10) || null
      : null;
    const overridePower = overridePowerEnabled
      ? parseInt(formData.get("overridePowerValue"), 10) || null
      : null;

    try {
      if (this._sourceActor) {
        await NpcGenerator.applyToActor(this._sourceActor, {
          level,
          abilities,
          resolveOverride: overrideResolve,
          powerOverride: overridePower,
        });

        ui.notifications.info(
          game.i18n.format("EVENTIDE_RP_SYSTEM.NpcGenerator.AppliedSuccess", {
            name: this._sourceActor.name,
          }),
        );
      } else {
        let template = null;
        if (distributionMode === "template" && templateId) {
          template = templateId;
        }

        const actor = await NpcGenerator.generateNPC({
          level,
          template,
          name: npcName || undefined,
          resolveOverride: overrideResolve,
          powerOverride: overridePower,
        });

        if (actor) {
          actor.sheet.render(true);
          ui.notifications.info(
            game.i18n.format("EVENTIDE_RP_SYSTEM.NpcGenerator.CreatedSuccess", {
              name: actor.name,
            }),
          );
        }
      }
    } catch (error) {
      Logger.error("NPC generation failed", error, "NPC_GENERATOR");
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.NpcGenerator.GenerationFailed"),
      );
    }
  }
}