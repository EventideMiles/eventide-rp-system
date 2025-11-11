import { EventideSheetHelpers } from "../components/_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  applyThemeImmediate,
  cleanupThemeManager,
} from "../../helpers/_module.mjs";
import { Logger, TransformationConverter } from "../../services/_module.mjs";

/**
 * A form application for converting transformation items to actors.
 * @extends {EventideSheetHelpers}
 */
export class TransformationToActorConverter extends EventideSheetHelpers {
  static PARTS = {
    transformationToActor: {
      template:
        "systems/eventide-rp-system/templates/macros/transformation-to-actor-converter.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    id: "transformation-to-actor-converter",
    classes: [
      "eventide-sheet",
      "eventide-sheet--scrollbars",
      "transformation-to-actor-converter",
    ],
    position: {
      width: 600,
      height: "auto",
    },
    tag: "form",
    window: {
      icon: "fa-solid fa-user-plus",
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
      "EVENTIDE_RP_SYSTEM.WindowTitles.TransformationToActor",
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

    // Get all transformations from world and compendiums
    context.transformations = await this.#getAvailableTransformations();

    // Provide actor type options
    context.actorTypeOptions = [
      {
        value: "npc",
        label: game.i18n.localize("TYPES.Actor.npc"),
        selected: true,
      },
      {
        value: "character",
        label: game.i18n.localize("TYPES.Actor.character"),
      },
    ];

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
          "EVENTIDE_RP_SYSTEM.Forms.Callouts.Conversion.TransformationToActorGeneric",
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
   * Get all available transformations from world and compendiums
   * @returns {Promise<Array>} Array of transformation data
   * @private
   */
  async #getAvailableTransformations() {
    const transformations = [];

    // Add transformations from world
    for (const item of game.items.contents) {
      if (item.type === "transformation") {
        transformations.push({
          id: item.id,
          uuid: item.uuid,
          name: item.name,
          img: item.img,
          source: "world",
        });
      }
    }

    // Add transformations from compendiums
    for (const pack of game.packs) {
      if (pack.documentName === "Item") {
        const index = await pack.getIndex();
        for (const entry of index) {
          if (entry.type === "transformation") {
            transformations.push({
              id: entry._id,
              uuid: `Compendium.${pack.collection}.${entry._id}`,
              name: entry.name,
              img: entry.img,
              source: pack.metadata.label,
            });
          }
        }
      }
    }

    return transformations.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Handle form submission
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The form data
   */
  static async #onSubmit(event, form, formData) {
    const transformationUuid = formData.get("transformationSelect");

    if (!transformationUuid) {
      ui.notifications.warn(
        game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Errors.NoTransformationSelected",
        ),
      );
      return;
    }

    // Load the transformation from UUID
    const transformation = await fromUuid(transformationUuid);
    if (!transformation) {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ItemNotFound"),
      );
      return;
    }

    // Verify it's a transformation
    if (transformation.type !== "transformation") {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ItemNotTransformation"),
      );
      return;
    }

    const name = formData.get("name")?.trim() || transformation.name;
    const type = formData.get("actorType") || "npc";
    const createIn = formData.get("createIn") || "both";
    const compendiumId = formData.get("compendium")?.trim();

    const options = {
      name,
      type,
      createIn,
    };

    // Add compendium if specified
    if (compendiumId) {
      options.compendium = compendiumId;
    }

    try {
      const result = await TransformationConverter.transformationToActor(
        transformation,
        options,
      );

      // Open the created actor sheet(s)
      if (result.world) {
        result.world.sheet.render(true);
      } else if (result.compendium) {
        result.compendium.sheet.render(true);
      }
    } catch (error) {
      Logger.error(
        "Failed to convert transformation to actor",
        error,
        "TRANSFORMATION_TO_ACTOR_CONVERTER",
      );
      ui.notifications.error(
        game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Errors.TransformationToActorFailed",
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
            "Theme management initialized asynchronously for transformation to actor converter",
            {
              hasThemeManager: !!this.themeManager,
              sheetId: this.id,
            },
            "THEME",
          );
        })
        .catch((error) => {
          Logger.error(
            "Failed to initialize theme manager for transformation to actor converter",
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
