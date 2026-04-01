// @ts-nocheck
/**
 * @fileoverview Tests for Handlebars partials initialization
 *
 * Tests the registration of Handlebars partials for the Eventide RP System.
 */

import { initHandlebarsPartials } from '../../../../module/services/settings/handlebars-partials.mjs';

// Mock Logger
vi.mock('../../../../module/services/logger.mjs', () => ({
  Logger: {
    error: vi.fn(),
  },
}));

describe('Handlebars Partials', () => {
  let mockFetch;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Mock fetch globally
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock Handlebars.registerPartial
    global.Handlebars = {
      registerPartial: vi.fn(),
    };
  });

  describe('initHandlebarsPartials()', () => {
    test('should register all defined partials', async () => {
      // Arrange - Mock successful fetch responses for all partials
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '<div>template content</div>',
      });

      // Act - Initialize partials
      await initHandlebarsPartials();

      // Assert - Verify fetch was called for each partial
      expect(mockFetch).toHaveBeenCalledTimes(18);

      // Assert - Verify registerPartial was called for each partial
      expect(global.Handlebars.registerPartial).toHaveBeenCalledTimes(18);
    });

    test('should register erps-color-picker partial', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '<div>color picker</div>',
      });

      // Act
      await initHandlebarsPartials();

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'systems/eventide-rp-system/templates/partials/erps-color-picker.hbs',
      );
      expect(global.Handlebars.registerPartial).toHaveBeenCalledWith(
        'erps-color-picker',
        '<div>color picker</div>',
      );
    });

    test('should register item-selector-combo-box partial', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '<div>combo box</div>',
      });

      // Act
      await initHandlebarsPartials();

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'systems/eventide-rp-system/templates/components/item-selector-combo-box.hbs',
      );
      expect(global.Handlebars.registerPartial).toHaveBeenCalledWith(
        'components/item-selector-combo-box',
        '<div>combo box</div>',
      );
    });

    test('should register macro partials', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '<div>macro partial</div>',
      });

      // Act
      await initHandlebarsPartials();

      // Assert - Verify macro partials are registered
      const macroPartials = [
        'character-effects',
        'macro-footer',
        'callout-box',
        'card-effects',
        'card-ac-check',
        'roll-info',
        'color-pickers',
        'popup-effects',
        'popup-roll',
        'popup-header',
      ];

      macroPartials.forEach((partialName) => {
        expect(global.Handlebars.registerPartial).toHaveBeenCalledWith(
          partialName,
          '<div>macro partial</div>',
        );
      });
    });

    test('should register actor partials', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '<div>actor partial</div>',
      });

      // Act
      await initHandlebarsPartials();

      // Assert - Verify actor partials are registered
      const actorPartials = [
        'actor-abilities',
        'actor-status',
        'actor-primary-resources',
        'actor-secondary-resources',
        'actor/partials/action-card-row',
      ];

      actorPartials.forEach((partialName) => {
        expect(global.Handlebars.registerPartial).toHaveBeenCalledWith(
          partialName,
          '<div>actor partial</div>',
        );
      });
    });

    test('should register item partials', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '<div>item partial</div>',
      });

      // Act
      await initHandlebarsPartials();

      // Assert - Verify item partials are registered
      expect(global.Handlebars.registerPartial).toHaveBeenCalledWith(
        'item/partials/transformation-action-card-row',
        '<div>item partial</div>',
      );
    });

    test('should log error when fetch fails', async () => {
      // Arrange
      const { Logger } = await import('../../../../module/services/logger.mjs');
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      // Act
      await initHandlebarsPartials();

      // Assert - Verify error was logged
      expect(Logger.error).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load Handlebars partial'),
        expect.any(Error),
        'HANDLEBARS',
      );
    });

    test('should log error when fetch throws exception', async () => {
      // Arrange
      const { Logger } = await import('../../../../module/services/logger.mjs');
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act
      await initHandlebarsPartials();

      // Assert - Verify error was logged
      expect(Logger.error).toHaveBeenCalled();
    });

    test('should continue registering other partials when one fails', async () => {
      // Arrange
      const { Logger } = await import('../../../../module/services/logger.mjs');
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        // Fail on the third call
        if (callCount === 3) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.resolve({
          ok: true,
          text: async () => '<div>template</div>',
        });
      });

      // Act
      await initHandlebarsPartials();

      // Assert - Verify all partials were attempted
      expect(mockFetch).toHaveBeenCalledTimes(18);
      // Verify error was logged for the failed partial
      expect(Logger.error).toHaveBeenCalled();
      // Verify other partials were still registered
      expect(global.Handlebars.registerPartial).toHaveBeenCalled();
    });

    test('should handle empty template content', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '',
      });

      // Act
      await initHandlebarsPartials();

      // Assert - Should still register the partial with empty content
      expect(global.Handlebars.registerPartial).toHaveBeenCalledWith(
        expect.any(String),
        '',
      );
    });

    test('should fetch partials in parallel', async () => {
      // Arrange
      const fetchPromises = [];
      mockFetch.mockImplementation(() => {
        const promise = Promise.resolve({
          ok: true,
          text: async () => '<div>template</div>',
        });
        fetchPromises.push(promise);
        return promise;
      });

      // Act
      await initHandlebarsPartials();

      // Assert - All fetches should have been initiated
      expect(fetchPromises.length).toBe(18);
    });
  });
});
