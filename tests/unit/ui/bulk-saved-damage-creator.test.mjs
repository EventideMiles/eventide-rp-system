// @ts-nocheck
/**
 * @fileoverview BulkSavedDamageCreator dialog tests
 *
 * Tests the pure helper methods (filtering, card building, form-data reading,
 * group selection parsing, config validation) plus the folder-scanning logic
 * (recursive and non-recursive) and the client-setting persistence flow.
 *
 * The dialog class extends EventideSheetHelpers which extends a chain of
 * Foundry ApplicationV2 mixins; we mock those away and exercise the pure
 * logic directly.
 */

import { BulkSavedDamageCreator } from "../../../module/ui/macros/bulk-saved-damage-creator.mjs";

// ---------------------------------------------------------------------------
// Mocks
//
// vi.mock factories are hoisted to the top of the file by Vitest, so any
// variables they reference must also be hoisted. We use vi.hoisted() to
// declare mock objects that the factories can safely use.
// ---------------------------------------------------------------------------

const {
  mockLogger,
  mockValidateDamage,
  mockValidateRepetition,
  mockGetSetting,
  mockSetSetting,
  mockHandleAsync,
} = vi.hoisted(() => ({
  mockLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  mockValidateDamage: vi.fn(() => ({ isValid: true })),
  mockValidateRepetition: vi.fn(() => ({ isValid: true })),
  mockGetSetting: vi.fn(() => null),
  mockSetSetting: vi.fn(async () => undefined),
  // ErrorHandler.handleAsync: default pass-through (success path).
  mockHandleAsync: vi.fn(async (promise) => {
    const result = await promise;
    return [result, null];
  }),
}));

vi.mock("../../../module/services/logger.mjs", () => ({
  Logger: mockLogger,
}));

vi.mock("../../../module/services/formula-validator.mjs", () => ({
  FormulaValidator: class {
    validateDamageFormula = mockValidateDamage;
    validateRepetitionFormula = mockValidateRepetition;
  },
}));

vi.mock("../../../module/services/default-data-factory.mjs", () => ({
  DefaultDataFactory: {
    getActionCardData: () => ({
      system: {
        mode: "attackChain",
        bgColor: "#000000",
        textColor: "#ffffff",
        attackChain: {},
        savedDamage: { formula: "1d6", type: "damage" },
      },
    }),
  },
}));

vi.mock("../../../module/helpers/_module.mjs", () => ({
  initThemeManager: vi.fn(),
  THEME_PRESETS: { CREATOR_APPLICATION: {} },
  applyThemeImmediate: vi.fn(),
  cleanupThemeManager: vi.fn(),
}));

vi.mock("../../../module/services/settings/settings.mjs", () => ({
  getSetting: mockGetSetting,
  setSetting: mockSetSetting,
}));

// ErrorHandler: default pass-through (success path). Tests that need the
// failure path override mockHandleAsync in their own beforeEach/test body.
vi.mock("../../../module/utils/error-handler.mjs", () => ({
  ErrorHandler: {
    ERROR_TYPES: {
      VALIDATION: "validation",
      NETWORK: "network",
      PERMISSION: "permission",
      DATA: "data",
      UI: "ui",
      FOUNDRY_API: "foundry_api",
      UNKNOWN: "unknown",
    },
    handleAsync: mockHandleAsync,
  },
}));

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("BulkSavedDamageCreator", () => {
  let mockActor;
  let originalFilePickerBrowse;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset validator mocks to "valid" by default.
    mockValidateDamage.mockReturnValue({ isValid: true });
    mockValidateRepetition.mockReturnValue({ isValid: true });

    // Reset ErrorHandler to pass-through (success path) by default.
    mockHandleAsync.mockImplementation(async (promise) => {
      const result = await promise;
      return [result, null];
    });

    mockGetSetting.mockReturnValue(null);
    mockSetSetting.mockResolvedValue(undefined);

    mockActor = {
      name: "Test Actor",
      system: { actionCardGroups: [] },
      createEmbeddedDocuments: vi.fn().mockResolvedValue([{ id: "card1" }]),
      update: vi.fn().mockResolvedValue(undefined),
    };

    // Stub FilePicker.browse — individual tests override the return value.
    originalFilePickerBrowse = global.foundry.applications.apps.FilePicker
      .implementation.browse;
    global.foundry.applications.apps.FilePicker.implementation.browse = vi.fn(
      async () => ({ files: [], dirs: [] }),
    );

    // foundry.utils.randomID is already mocked in setup.mjs (returns id-<rand>).
  });

  afterEach(() => {
    // Restore the original browse mock to avoid bleed between tests.
    if (originalFilePickerBrowse !== undefined) {
      global.foundry.applications.apps.FilePicker.implementation.browse =
        originalFilePickerBrowse;
    }
  });

  // Helper: construct a dialog instance.
  function makeDialog(options = {}) {
    return new BulkSavedDamageCreator({ actor: mockActor, ...options });
  }

  // =========================================================================
  // _buildImageEntries (pure helper)
  // =========================================================================

  describe("_buildImageEntries", () => {
    test("filters out non-image files", () => {
      const result = BulkSavedDamageCreator._buildImageEntries(
        [
          "icons/a.png",
          "icons/b.jpg",
          "icons/readme.txt",
          "icons/notes.md",
          "icons/c.jpeg",
        ],
        "icons",
      );
      expect(result).toHaveLength(3);
      expect(result.map((e) => e.name).sort()).toEqual([
        "a.png",
        "b.jpg",
        "c.jpeg",
      ]);
    });

    test("recognizes all supported extensions case-insensitively", () => {
      const result = BulkSavedDamageCreator._buildImageEntries(
        [
          "x/a.PNG",
          "x/b.WebP",
          "x/c.GIF",
          "x/d.svg",
          "x/e.bmp",
        ],
        "x",
      );
      expect(result).toHaveLength(5);
    });

    test("uses just the filename for top-level files", () => {
      const result = BulkSavedDamageCreator._buildImageEntries(
        ["root/dragon.png"],
        "root",
      );
      expect(result[0].name).toBe("dragon.png");
      expect(result[0].path).toBe("root/dragon.png");
    });

    test("uses relative path for nested files (recursive scan)", () => {
      const result = BulkSavedDamageCreator._buildImageEntries(
        ["root/boss/dragon.png", "root/boss/minion/goblin.png"],
        "root",
      );
      expect(result[0].name).toBe("boss/dragon.png");
      expect(result[1].name).toBe("boss/minion/goblin.png");
    });

    test("falls back to filename when root is empty", () => {
      const result = BulkSavedDamageCreator._buildImageEntries(
        ["lonely.png"],
        "",
      );
      expect(result[0].name).toBe("lonely.png");
    });

    test("strips leading slashes from paths", () => {
      const result = BulkSavedDamageCreator._buildImageEntries(
        ["//icons/a.png"],
        "icons",
      );
      expect(result[0].path).toBe("icons/a.png");
    });

    test("handles trailing slash in root folder", () => {
      const result = BulkSavedDamageCreator._buildImageEntries(
        ["root/sub/x.png"],
        "root/",
      );
      expect(result[0].name).toBe("sub/x.png");
    });

    test("returns empty array for empty input", () => {
      expect(BulkSavedDamageCreator._buildImageEntries([], "root")).toEqual([]);
    });
  });

  // =========================================================================
  // _readConfigFromFormData (pure helper)
  // =========================================================================

  describe("_readConfigFromFormData", () => {
    test("applies defaults for missing fields", () => {
      const config = BulkSavedDamageCreator._readConfigFromFormData({});
      expect(config.resolveFormula).toBe("1d6");
      expect(config.powerFormula).toBe("0");
      expect(config.repetitions).toBe("1");
      expect(config.bgColor).toBe("#8B4513");
      expect(config.textColor).toBe("#ffffff");
    });

    test("reads provided values", () => {
      const config = BulkSavedDamageCreator._readConfigFromFormData({
        resolveFormula: "2d6+3",
        resolveType: "heal",
        powerFormula: "1d4",
        powerType: "damage",
        repetitions: "1d4",
        bgColor: "#ff0000",
        textColor: "#00ff00",
      });
      expect(config.resolveFormula).toBe("2d6+3");
      expect(config.resolveType).toBe("heal");
      expect(config.powerFormula).toBe("1d4");
      expect(config.repetitions).toBe("1d4");
      expect(config.bgColor).toBe("#ff0000");
    });

    test('normalizes checkbox "on" to true', () => {
      const config = BulkSavedDamageCreator._readConfigFromFormData({
        damageApplication: "on",
        powerDamageApplication: "on",
        recursive: "on",
      });
      expect(config.damageApplication).toBe(true);
      expect(config.powerDamageApplication).toBe(true);
      expect(config.recursive).toBe(true);
    });

    test("normalizes missing checkboxes to false", () => {
      const config = BulkSavedDamageCreator._readConfigFromFormData({});
      expect(config.damageApplication).toBe(false);
      expect(config.powerDamageApplication).toBe(false);
      expect(config.recursive).toBe(false);
    });

    test("coerces resolveType to damage when invalid", () => {
      const config = BulkSavedDamageCreator._readConfigFromFormData({
        resolveType: "invalid",
      });
      expect(config.resolveType).toBe("damage");
    });

    test("trims formula strings", () => {
      const config = BulkSavedDamageCreator._readConfigFromFormData({
        resolveFormula: "  2d6  ",
        powerFormula: "  1d4  ",
        repetitions: "  3  ",
      });
      expect(config.resolveFormula).toBe("2d6");
      expect(config.powerFormula).toBe("1d4");
      expect(config.repetitions).toBe("3");
    });
  });

  // =========================================================================
  // _readGroupConfigFromFormData (pure helper)
  // =========================================================================

  describe("_readGroupConfigFromFormData", () => {
    test("returns mode none for empty selection", () => {
      const result = BulkSavedDamageCreator._readGroupConfigFromFormData(
        { groupSelection: "" },
        mockActor,
      );
      expect(result.mode).toBe("none");
    });

    test("returns mode none for missing selection", () => {
      const result = BulkSavedDamageCreator._readGroupConfigFromFormData(
        {},
        mockActor,
      );
      expect(result.mode).toBe("none");
    });

    test("returns mode new for __new__ sentinel", () => {
      const result = BulkSavedDamageCreator._readGroupConfigFromFormData(
        { groupSelection: "__new__", newGroupName: "Boss Attacks" },
        mockActor,
      );
      expect(result.mode).toBe("new");
      expect(result.newName).toBe("Boss Attacks");
    });

    test("returns mode new with empty name when not provided", () => {
      const result = BulkSavedDamageCreator._readGroupConfigFromFormData(
        { groupSelection: "__new__" },
        mockActor,
      );
      expect(result.mode).toBe("new");
      expect(result.newName).toBe("");
    });

    test("returns mode existing for a valid group ID", () => {
      mockActor.system.actionCardGroups = [
        { _id: "g1", name: "Group 1" },
        { _id: "g2", name: "Group 2" },
      ];
      const result = BulkSavedDamageCreator._readGroupConfigFromFormData(
        { groupSelection: "g1" },
        mockActor,
      );
      expect(result.mode).toBe("existing");
      expect(result.existingId).toBe("g1");
    });

    test("falls back to none when existing ID is not on the actor", () => {
      mockActor.system.actionCardGroups = [{ _id: "g1", name: "Group 1" }];
      const result = BulkSavedDamageCreator._readGroupConfigFromFormData(
        { groupSelection: "deleted-group-id" },
        mockActor,
      );
      expect(result.mode).toBe("none");
      expect(result.existingId).toBe("");
    });

    test("falls back to none when actor has no groups array", () => {
      mockActor.system.actionCardGroups = undefined;
      const result = BulkSavedDamageCreator._readGroupConfigFromFormData(
        { groupSelection: "any-id" },
        mockActor,
      );
      expect(result.mode).toBe("none");
    });
  });

  // =========================================================================
  // _buildCardData (pure helper)
  // =========================================================================

  describe("_buildCardData", () => {
    const baseConfig = {
      resolveFormula: "2d6",
      resolveType: "damage",
      powerFormula: "1d4",
      powerType: "heal",
      repetitions: "2",
      damageApplication: true,
      powerDamageApplication: false,
      bgColor: "#123456",
      textColor: "#abcdef",
    };
    const baseSystem = {
      mode: "attackChain",
      bgColor: "#000000",
      textColor: "#ffffff",
      savedDamage: { formula: "1d6", type: "damage" },
    };

    test("uses entry.name as the card name", () => {
      const card = BulkSavedDamageCreator._buildCardData(
        { path: "x/y.png", name: "y.png" },
        baseConfig,
        baseSystem,
        null,
      );
      expect(card.name).toBe("y.png");
    });

    test("uses entry.path as the img", () => {
      const card = BulkSavedDamageCreator._buildCardData(
        { path: "x/y.png", name: "y.png" },
        baseConfig,
        baseSystem,
        null,
      );
      expect(card.img).toBe("x/y.png");
    });

    test("sets type to actionCard", () => {
      const card = BulkSavedDamageCreator._buildCardData(
        { path: "y.png", name: "y.png" },
        baseConfig,
        baseSystem,
        null,
      );
      expect(card.type).toBe("actionCard");
    });

    test("sets mode to savedDamage", () => {
      const card = BulkSavedDamageCreator._buildCardData(
        { path: "y.png", name: "y.png" },
        baseConfig,
        baseSystem,
        null,
      );
      expect(card.system.mode).toBe("savedDamage");
    });

    test("writes savedDamage formulas from config", () => {
      const card = BulkSavedDamageCreator._buildCardData(
        { path: "y.png", name: "y.png" },
        baseConfig,
        baseSystem,
        null,
      );
      expect(card.system.savedDamage).toEqual({
        formula: "2d6",
        type: "damage",
        powerFormula: "1d4",
        powerType: "heal",
      });
    });

    test("writes repetition fields from config", () => {
      const card = BulkSavedDamageCreator._buildCardData(
        { path: "y.png", name: "y.png" },
        baseConfig,
        baseSystem,
        null,
      );
      expect(card.system.repetitions).toBe("2");
      expect(card.system.damageApplication).toBe(true);
      expect(card.system.powerDamageApplication).toBe(false);
    });

    test("writes colors from config", () => {
      const card = BulkSavedDamageCreator._buildCardData(
        { path: "y.png", name: "y.png" },
        baseConfig,
        baseSystem,
        null,
      );
      expect(card.system.bgColor).toBe("#123456");
      expect(card.system.textColor).toBe("#abcdef");
    });

    test("sets groupId when provided", () => {
      const card = BulkSavedDamageCreator._buildCardData(
        { path: "y.png", name: "y.png" },
        baseConfig,
        baseSystem,
        "group-123",
      );
      expect(card.system.groupId).toBe("group-123");
    });

    test("sets groupId to null when not provided", () => {
      const card = BulkSavedDamageCreator._buildCardData(
        { path: "y.png", name: "y.png" },
        baseConfig,
        baseSystem,
        null,
      );
      // The mergeObject mock in tests skips null values, so we accept
      // either null (production) or undefined (test env).
      expect([null, undefined]).toContain(card.system.groupId);
    });

    test("clears description", () => {
      const card = BulkSavedDamageCreator._buildCardData(
        { path: "y.png", name: "y.png" },
        baseConfig,
        { ...baseSystem, description: "should be wiped" },
        null,
      );
      expect(card.system.description).toBe("");
    });

    test("does not mutate the baseSystem template", () => {
      const card = BulkSavedDamageCreator._buildCardData(
        { path: "y.png", name: "y.png" },
        baseConfig,
        baseSystem,
        null,
      );
      expect(baseSystem.mode).toBe("attackChain");
      expect(card.system.mode).toBe("savedDamage");
    });
  });

  // =========================================================================
  // _validateConfig
  // =========================================================================

  describe("_validateConfig", () => {
    const validConfig = {
      resolveFormula: "1d6",
      powerFormula: "0",
      repetitions: "1",
    };

    test("returns null when all formulas are valid", () => {
      const dialog = makeDialog();
      expect(dialog._validateConfig(validConfig)).toBeNull();
    });

    test("returns error string when resolve formula is invalid", () => {
      mockValidateDamage
        .mockReturnValueOnce({ isValid: false })
        .mockReturnValueOnce({ isValid: true }); // power check
      const dialog = makeDialog();
      const result = dialog._validateConfig(validConfig);
      expect(result).not.toBeNull();
      expect(typeof result).toBe("string");
    });

    test("returns error string when power formula is invalid", () => {
      mockValidateDamage
        .mockReturnValueOnce({ isValid: true }) // resolve
        .mockReturnValueOnce({ isValid: false }); // power
      const dialog = makeDialog();
      const result = dialog._validateConfig(validConfig);
      expect(result).not.toBeNull();
    });

    test("returns error string when repetition formula is invalid", () => {
      mockValidateDamage.mockReturnValue({ isValid: true });
      mockValidateRepetition.mockReturnValue({ isValid: false });
      const dialog = makeDialog();
      const result = dialog._validateConfig(validConfig);
      expect(result).not.toBeNull();
    });

    test("validates resolve formula with allowBlank=false and allowDataRefs=false", () => {
      makeDialog()._validateConfig(validConfig);
      expect(mockValidateDamage).toHaveBeenCalledWith("1d6", {
        allowBlank: false,
        allowDataRefs: false,
      });
    });

    test("validates power formula with allowBlank=true and allowDataRefs=false", () => {
      makeDialog()._validateConfig(validConfig);
      // Second call to validateDamage is the power check.
      const powerCall = mockValidateDamage.mock.calls.find(
        (call) => call[0] === "0",
      );
      expect(powerCall).toBeDefined();
      expect(powerCall[1]).toEqual({
        allowBlank: true,
        allowDataRefs: false,
      });
    });

    test("validates repetition formula with maxRepetitions=100", () => {
      makeDialog()._validateConfig(validConfig);
      expect(mockValidateRepetition).toHaveBeenCalledWith("1", {
        maxRepetitions: 100,
      });
    });
  });

  // =========================================================================
  // _collectFiles (recursive scanning)
  // =========================================================================

  describe("_collectFiles", () => {
    test("returns files from a flat scan (non-recursive)", async () => {
      global.foundry.applications.apps.FilePicker.implementation.browse =
        vi.fn(async () => ({
          files: ["root/a.png", "root/b.png"],
          dirs: ["root/sub"], // ignored because recursive=false
        }));

      const dialog = makeDialog();
      const files = await dialog._collectFiles(
        "root",
        "data",
        /* recursive */ false,
      );
      expect(files).toEqual(["root/a.png", "root/b.png"]);
    });

    test("descends into subdirectories when recursive=true", async () => {
      const browseMock = vi.fn();
      browseMock
        .mockResolvedValueOnce({
          files: ["root/top.png"],
          dirs: ["root/sub"],
        })
        .mockResolvedValueOnce({
          files: ["root/sub/nested.png"],
          dirs: ["root/sub/deep"],
        })
        .mockResolvedValueOnce({
          files: ["root/sub/deep/deep.png"],
          dirs: [],
        });
      global.foundry.applications.apps.FilePicker.implementation.browse =
        browseMock;

      const dialog = makeDialog();
      const files = await dialog._collectFiles(
        "root",
        "data",
        /* recursive */ true,
      );
      expect(files).toEqual([
        "root/top.png",
        "root/sub/nested.png",
        "root/sub/deep/deep.png",
      ]);
    });

    test("stops descending after MAX_RECURSION_DEPTH", async () => {
      const browseMock = vi.fn(async () => ({
        files: [],
        dirs: ["deeper"],
      }));
      global.foundry.applications.apps.FilePicker.implementation.browse =
        browseMock;

      const dialog = makeDialog();
      // Force a deep starting depth to exercise the cap quickly.
      await dialog._collectFiles("root", "data", true, 10);
      expect(browseMock).not.toHaveBeenCalled();
    });

    test("propagates browse error via rejection (does not swallow)", async () => {
      global.foundry.applications.apps.FilePicker.implementation.browse =
        vi.fn(async () => {
          throw new Error("Network error");
        });

      const dialog = makeDialog();
      await expect(dialog._collectFiles("root", "data", false)).rejects.toThrow(
        "Network error",
      );
    });
  });

  // =========================================================================
  // _scanFolder (integration: collectFiles + buildImageEntries + state)
  // =========================================================================

  describe("_scanFolder", () => {
    test("sets NoFolder error when folder is empty", async () => {
      const dialog = makeDialog();
      await dialog._scanFolder("");
      expect(dialog._discoveredImages).toEqual([]);
      expect(dialog._scanError).not.toBeNull();
    });

    test("populates discoveredImages with filtered entries", async () => {
      global.foundry.applications.apps.FilePicker.implementation.browse =
        vi.fn(async () => ({
          files: ["icons/a.png", "icons/b.jpg", "icons/readme.txt"],
          dirs: [],
        }));

      const dialog = makeDialog();
      dialog._folderPath = "icons";
      await dialog._scanFolder("icons");
      expect(dialog._discoveredImages).toHaveLength(2);
      expect(dialog._discoveredImages[0].name).toBe("a.png");
      expect(dialog._scanError).toBeNull();
    });

    test("sets NoImagesWithCount error when folder has files but no images", async () => {
      global.foundry.applications.apps.FilePicker.implementation.browse =
        vi.fn(async () => ({
          files: ["icons/readme.txt", "icons/data.json"],
          dirs: [],
        }));

      const dialog = makeDialog();
      await dialog._scanFolder("icons");
      expect(dialog._discoveredImages).toEqual([]);
      // i18n.format returns the raw key in tests, so we just verify an error
      // was set (the production path interpolates the file count + source).
      expect(dialog._scanError).not.toBeNull();
      expect(dialog._scanError).toMatch(/NoImagesWithCount/);
    });

    test("sets ScanFailedWithPath error when browse throws", async () => {
      global.foundry.applications.apps.FilePicker.implementation.browse =
        vi.fn(async () => {
          throw new Error("Permission denied");
        });

      const dialog = makeDialog();
      dialog._folderSource = "data";
      await dialog._scanFolder("bad/path");
      expect(dialog._discoveredImages).toEqual([]);
      // i18n.format returns the raw key in tests; production interpolates
      // the folder and source into the message.
      expect(dialog._scanError).not.toBeNull();
      expect(dialog._scanError).toMatch(/ScanFailedWithPath/);
    });

    test("respects recursive config flag (descends into subdirs)", async () => {
      const browseMock = vi.fn();
      browseMock
        .mockResolvedValueOnce({
          files: ["root/top.png"],
          dirs: ["root/sub"],
        })
        .mockResolvedValueOnce({
          files: ["root/sub/nested.png"],
          dirs: [],
        });
      global.foundry.applications.apps.FilePicker.implementation.browse =
        browseMock;

      const dialog = makeDialog();
      dialog._folderPath = "root";
      dialog._config.recursive = true;
      await dialog._scanFolder("root");
      expect(dialog._discoveredImages).toHaveLength(2);
      // Nested file should have its relative path as the name.
      const nested = dialog._discoveredImages.find(
        (e) => e.path === "root/sub/nested.png",
      );
      expect(nested.name).toBe("sub/nested.png");
      expect(browseMock).toHaveBeenCalledTimes(2);
    });

    test("non-recursive scan ignores subdirectories", async () => {
      const browseMock = vi.fn(async () => ({
        files: ["root/top.png"],
        dirs: ["root/sub"],
      }));
      global.foundry.applications.apps.FilePicker.implementation.browse =
        browseMock;

      const dialog = makeDialog();
      dialog._folderPath = "root";
      dialog._config.recursive = false;
      await dialog._scanFolder("root");
      expect(dialog._discoveredImages).toHaveLength(1);
      expect(browseMock).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Persistence (_loadSavedConfig / _persistConfig)
  // =========================================================================

  describe("_loadSavedConfig", () => {
    test("returns saved object when setting is registered", () => {
      mockGetSetting.mockReturnValue({ resolveFormula: "3d6" });
      const dialog = makeDialog();
      expect(dialog._loadSavedConfig()).toEqual({ resolveFormula: "3d6" });
    });

    test("returns empty object when setting returns null", () => {
      mockGetSetting.mockReturnValue(null);
      const dialog = makeDialog();
      expect(dialog._loadSavedConfig()).toEqual({});
    });

    test("returns empty object when setting returns non-object", () => {
      mockGetSetting.mockReturnValue("not-an-object");
      const dialog = makeDialog();
      expect(dialog._loadSavedConfig()).toEqual({});
    });

    test("returns empty object when getSetting throws", () => {
      mockGetSetting.mockImplementation(() => {
        throw new Error("not registered");
      });
      const dialog = makeDialog();
      expect(dialog._loadSavedConfig()).toEqual({});
    });

    test("constructor merges saved config over defaults", () => {
      mockGetSetting.mockReturnValue({
        resolveFormula: "5d6",
        bgColor: "#aabbcc",
        recursive: true,
      });
      const dialog = makeDialog();
      expect(dialog._config.resolveFormula).toBe("5d6");
      expect(dialog._config.bgColor).toBe("#aabbcc");
      expect(dialog._config.recursive).toBe(true);
      // Untouched fields keep their defaults.
      expect(dialog._config.repetitions).toBe("1");
      expect(dialog._config.textColor).toBe("#ffffff");
    });

    test("constructor uses defaults when setting is unset", () => {
      mockGetSetting.mockReturnValue(null);
      const dialog = makeDialog();
      expect(dialog._config.resolveFormula).toBe("1d6");
      expect(dialog._config.bgColor).toBe("#8B4513");
    });

    test("constructor reads folderPath/folderSource from saved config", () => {
      mockGetSetting.mockReturnValue({
        folderPath: "saved/path",
        folderSource: "public",
      });
      const dialog = makeDialog();
      expect(dialog._folderPath).toBe("saved/path");
      expect(dialog._folderSource).toBe("public");
    });

    test("constructor folderPath option overrides saved value", () => {
      mockGetSetting.mockReturnValue({ folderPath: "saved/path" });
      const dialog = makeDialog({ folderPath: "override/path" });
      expect(dialog._folderPath).toBe("override/path");
    });
  });

  describe("_persistConfig", () => {
    test("writes config payload to settings", async () => {
      const dialog = makeDialog();
      dialog._folderPath = "my/folder";
      dialog._folderSource = "data";
      await dialog._persistConfig({
        resolveFormula: "2d6",
        resolveType: "damage",
        powerFormula: "0",
        powerType: "damage",
        repetitions: "1",
        damageApplication: true,
        powerDamageApplication: false,
        bgColor: "#111111",
        textColor: "#222222",
        recursive: true,
      });
      expect(mockSetSetting).toHaveBeenCalledWith(
        "bulkSavedDamageCreatorConfig",
        expect.objectContaining({
          folderPath: "my/folder",
          folderSource: "data",
          resolveFormula: "2d6",
          powerDamageApplication: false,
          recursive: true,
        }),
      );
    });

    test("does not throw when setSetting rejects", async () => {
      mockSetSetting.mockRejectedValue(new Error("storage error"));
      const dialog = makeDialog();
      await expect(dialog._persistConfig({})).resolves.toBeUndefined();
      // Logger.warn should have been called (swallowed error).
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    test("does not persist group selection", async () => {
      const dialog = makeDialog();
      dialog._groupConfig = {
        mode: "new",
        existingId: "g1",
        newName: "Boss",
      };
      await dialog._persistConfig({ resolveFormula: "1d6" });
      const payload = mockSetSetting.mock.calls[0][1];
      expect(payload).not.toHaveProperty("mode");
      expect(payload).not.toHaveProperty("groupConfig");
      expect(payload).not.toHaveProperty("newName");
    });
  });

  // =========================================================================
  // _createNewGroup
  // =========================================================================

  describe("_createNewGroup", () => {
    test("creates a new group on the actor with the provided name", async () => {
      const dialog = makeDialog();
      mockActor.system.actionCardGroups = [];
      const id = await dialog._createNewGroup("Boss Attacks");
      expect(typeof id).toBe("string");
      expect(mockActor.update).toHaveBeenCalledWith({
        "system.actionCardGroups": [
          expect.objectContaining({
            _id: id,
            name: "Boss Attacks",
            collapsed: false,
            sort: 0,
          }),
        ],
      });
    });

    test("auto-names when name is blank", async () => {
      const dialog = makeDialog();
      mockActor.system.actionCardGroups = [];
      await dialog._createNewGroup("");
      const call = mockActor.update.mock.calls[0][0];
      expect(call["system.actionCardGroups"][0].name).toBeTruthy();
    });

    test("computes sort based on existing groups", async () => {
      const dialog = makeDialog();
      mockActor.system.actionCardGroups = [
        { _id: "g1", name: "Group 1", sort: 0 },
        { _id: "g2", name: "Group 2", sort: 100000 },
      ];
      await dialog._createNewGroup("Group 3");
      const newGroup = mockActor.update.mock.calls[0][0][
        "system.actionCardGroups"
      ][2];
      expect(newGroup.sort).toBe(200000);
    });

    test("preserves existing groups when adding new one", async () => {
      const dialog = makeDialog();
      const existing = { _id: "g1", name: "Group 1", sort: 0 };
      mockActor.system.actionCardGroups = [existing];
      await dialog._createNewGroup("Group 2");
      const groups = mockActor.update.mock.calls[0][0][
        "system.actionCardGroups"
      ];
      expect(groups).toHaveLength(2);
      expect(groups[0]).toBe(existing);
    });
  });
});
