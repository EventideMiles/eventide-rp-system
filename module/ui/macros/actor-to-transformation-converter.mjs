import { EventideSheetHelpers } from "../components/_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  applyThemeImmediate,
  cleanupThemeManager,
} from "../../helpers/_module.mjs";
import { Logger, TransformationConverter } from "../../services/_module.mjs";

/**
 * A form application for converting actors to transformation items.
 * @extends {EventideSheetHelpers}
 */
export class ActorToTransformationConverter extends EventideSheetHelpers {
  static PARTS = {
    actorToTransformation: {
      template:
        "systems/eventide-rp-system/templates/macros/actor-to-transformation-converter.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    id: "actor-to-transformation-converter",
    classes: [
      "eventide-sheet",
      "eventide-sheet--scrollbars",
      "actor-to-transformation-converter",
    ],
    position: {
      width: 600,
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
  };

  /**
   * Get the localized window title
   * @returns {string} The localized window title
   */
  get title() {
    return game.i18n.format(
      "EVENTIDE_RP_SYSTEM.WindowTitles.ActorToTransformation",
    );
  }

  constructor(_options = {}) {
    super();
  }

  /**
   * Get data for the template render
   * @returns {Object} Template data
   */
  async _prepareContext(_options) {
    await EventideSheetHelpers._gmCheck();
    const context = await super._prepareContext(_options);

    // Get all actors from world and compendiums
    context.actors = await this.#getAvailableActors();

    // Provide creation location options
    context.createInOptions = [
      {
        value: "world",
        label: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Forms.Labels.CreateInWorld",
        ),
      },
      {
        value: "compendium",
        label: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Forms.Labels.CreateInCompendium",
        ),
      },
      {
        value: "both",
        label: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Forms.Labels.CreateInBoth",
        ),
        selected: true,
      },
    ];

    context.callouts = [
      {
        type: "information",
        faIcon: "fas fa-info-circle",
        text: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.Conversion.ActorToTransformationGeneric",
        ),
      },
    ];

    context.footerButtons = [
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Convert"),
        type: "submit",
        cssClass: "erps-button erps-button--primary",
      },
    ];

    return context;
  }

  /**
   * Get all available actors from world and compendiums
   * @returns {Promise<Array>} Array of actor data
   * @private
   */
  async #getAvailableActors() {
    const actors = [];

    // Add actors from world
    for (const actor of game.actors.contents) {
      actors.push({
        id: actor.id,
        uuid: actor.uuid,
        name: actor.name,
        type: actor.type,
        img: actor.img,
        source: "world",
      });
    }

    // Add actors from compendiums
    for (const pack of game.packs) {
      if (pack.documentName === "Actor") {
        const index = await pack.getIndex();
        for (const entry of index) {
          actors.push({
            id: entry._id,
            uuid: `Compendium.${pack.collection}.${entry._id}`,
            name: entry.name,
            type: entry.type,
            img: entry.img,
            source: pack.metadata.label,
          });
        }
      }
    }

    return actors.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Handle form submission
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The form data
   */
  static async #onSubmit(event, form, formData) {
    const actorUuid = formData.get("actorSelect");

    if (!actorUuid) {
      ui.notifications.warn(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.NoActorSelected"),
      );
      return;
    }

    // Load the actor from UUID
    const actor = await fromUuid(actorUuid);
    if (!actor) {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ActorNotFound"),
      );
      return;
    }

    const name = formData.get("name")?.trim() || actor.name;
    const createIn = formData.get("createIn") || "both";
    const compendiumId = formData.get("compendium")?.trim();

    const options = {
      name,
      createIn,
    };

    // Add compendium if specified
    if (compendiumId) {
      options.compendium = compendiumId;
    }

    try {
      const result = await TransformationConverter.actorToTransformation(
        actor,
        options,
      );

      // Open the created transformation sheet(s)
      if (result.world) {
        result.world.sheet.render(true);
      } else if (result.compendium) {
        result.compendium.sheet.render(true);
      }
    } catch (error) {
      Logger.error(
        "Failed to convert actor to transformation",
        error,
        "ACTOR_TO_TRANSFORMATION_CONVERTER",
      );
      ui.notifications.error(
        game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Errors.ActorToTransformationFailed",
        ),
      );
    }
  }

  /**
   * Handle rendering of the application
   * @param {ApplicationRenderContext} context - Prepared context data
   * @param {RenderOptions} options - Provided render options
   * @protected
   */
  _onRender(_context, _options) {
    super._onRender(_context, _options);

    // Re-apply themes on re-render (but don't reinitialize)
    if (this.themeManager) {
      this.themeManager.applyThemes();
    }
  }

  /**
   * Handle the first render of the application
   * @override
   * @protected
   */
  async _onFirstRender() {
    super._onFirstRender();

    // Apply theme immediately to prevent flashing
    applyThemeImmediate(this.element);

    // Initialize theme management only on first render (non-blocking like actor/item sheets)
    if (!this.themeManager) {
      initThemeManager(this, THEME_PRESETS.CREATOR_APPLICATION)
        .then((manager) => {
          this.themeManager = manager;
          Logger.debug(
            "Theme management initialized asynchronously for actor to transformation converter",
            {
              hasThemeManager: !!this.themeManager,
              sheetId: this.id,
            },
            "THEME",
          );
        })
        .catch((error) => {
          Logger.error(
            "Failed to initialize theme manager for actor to transformation converter",
            error,
            "THEME",
          );
        });
    }
  }

  /**
   * Clean up theme management before closing the application
   * @param {Object} options - The options for closing
   * @returns {Promise<void>}
   * @override
   */
  async _preClose(options) {
    // Clean up theme management for this specific instance
    if (this.themeManager) {
      cleanupThemeManager(this);
      this.themeManager = null;
    }

    // Clean up number inputs
    if (this.element) {
      erps.utils.cleanupNumberInputs(this.element);
    }

    await super._preClose(options);
  }
}
