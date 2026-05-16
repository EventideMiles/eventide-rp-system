import { EventideSheetHelpers } from "../components/_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  cleanupThemeManager,
  applyThemeImmediate,
} from "../../helpers/_module.mjs";
import { Logger } from "../../services/_module.mjs";

const ROLL_HISTORY_MAX = 50;
const SYSTEM_ID = "eventide-rp-system";
const FLAG_KEY = "rollHistory";

export class RollHistory extends EventideSheetHelpers {
  #actor = null;

  static PARTS = {
    rollHistory: {
      template: "systems/eventide-rp-system/templates/macros/roll-history.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    id: "roll-history",
    classes: ["eventide-sheet", "eventide-sheet--scrollbars", "roll-history"],
    position: {
      width: 520,
      height: "auto",
    },
    tag: "form",
    window: {
      icon: "fas fa-dice-d6",
    },
    form: {
      submitOnChange: false,
      closeOnSubmit: false,
    },
  };

  static forActor(actor) {
    const instance = new RollHistory();
    instance.#actor = actor;
    return instance;
  }

  static fromSelectedToken() {
    const tokens = canvas?.tokens?.controlled;
    if (!tokens || tokens.length === 0) {
      ui.notifications.warn(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.RollHistoryNoTokenSelected"),
      );
      return null;
    }
    if (tokens.length > 1) {
      ui.notifications.warn(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.RollHistorySelectSingleToken"),
      );
      return null;
    }
    return RollHistory.forActor(tokens[0].actor);
  }

  get title() {
    return game.i18n.format("EVENTIDE_RP_SYSTEM.RollHistory.WindowTitle", {
      name: this.#actor?.name ?? "???",
    });
  }

  async _prepareContext(_options) {
    const context = {};
    context.cssClass = RollHistory.DEFAULT_OPTIONS.classes.join(" ");

    const rawHistory = this.#actor?.getFlag(SYSTEM_ID, FLAG_KEY) || [];
    const rollTypeLabels = this._getRollTypeLabels();

    context.actorName = this.#actor?.name;
    context.rolls = rawHistory.toReversed().map((entry) => ({
      label: rollTypeLabels[entry.type] || entry.type,
      formula: entry.formula,
      total: entry.total,
      timeAgo: this._formatTimeAgo(entry.timestamp),
    }));
    context.empty = context.rolls.length === 0;

    context.footerButtons = [
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Close"),
        type: "button",
        cssClass: "erps-button",
        action: "close",
        icon: "fas fa-times",
      },
    ];

    return context;
  }

  _getRollTypeLabels() {
    const config = CONFIG.EVENTIDE_RP_SYSTEM.abilities || {};
    const labels = {};
    for (const [key, def] of Object.entries(config)) {
      labels[key] = def.label || key;
    }
    labels.gear = game.i18n.localize("EVENTIDE_RP_SYSTEM.RollHistory.TypeGear");
    labels.damage = game.i18n.localize("EVENTIDE_RP_SYSTEM.RollHistory.TypeDamage");
    labels.heal = game.i18n.localize("EVENTIDE_RP_SYSTEM.RollHistory.TypeHeal");
    labels.initiative = game.i18n.localize("EVENTIDE_RP_SYSTEM.RollHistory.TypeInitiative");
    labels.unaugmented = game.i18n.localize("EVENTIDE_RP_SYSTEM.RollHistory.TypeUnaugmented");
    labels.unknown = game.i18n.localize("EVENTIDE_RP_SYSTEM.RollHistory.TypeUnknown");
    return labels;
  }

  _formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return game.i18n.format("EVENTIDE_RP_SYSTEM.RollHistory.TimeAgo.Seconds", { seconds });
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return game.i18n.format("EVENTIDE_RP_SYSTEM.RollHistory.TimeAgo.Minutes", { minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return game.i18n.format("EVENTIDE_RP_SYSTEM.RollHistory.TimeAgo.Hours", { hours });
    const days = Math.floor(hours / 24);
    return game.i18n.format("EVENTIDE_RP_SYSTEM.RollHistory.TimeAgo.Days", { days });
  }

  _onRender(_context, _options) {
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
          Logger.error("Failed to initialize theme manager for roll history", error, "THEME");
        });
    }
  }

  async _preClose(options) {
    if (this.themeManager) {
      cleanupThemeManager(this);
      this.themeManager = null;
    }
    this.#actor = null;
    await super._preClose(options);
  }
}

export { ROLL_HISTORY_MAX, SYSTEM_ID, FLAG_KEY };
