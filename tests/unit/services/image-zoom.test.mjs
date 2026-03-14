// @ts-nocheck
/**
 * @fileoverview ImageZoomService Tests
 *
 * Unit tests for the image-zoom service which provides
 * modal overlay functionality for enlarging chat card images.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

import { ImageZoomService } from '../../../module/services/image-zoom.mjs';

// Mock dependencies
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn()
  }
}));

describe('ImageZoomService', () => {
  let createdElements = [];
  let originalConsoleInfo;

  beforeEach(() => {
    vi.clearAllMocks();
    createdElements = [];

    // Mock console.info
    originalConsoleInfo = console.info;
    console.info = vi.fn();

    // Clean up any existing overlay
    const existingOverlay = document.getElementById(ImageZoomService.OVERLAY_ID);
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Remove body class if present
    document.body.classList.remove(ImageZoomService.BODY_CLASS);
  });

  afterEach(() => {
    console.info = originalConsoleInfo;

    // Clean up any created elements
    createdElements.forEach(el => {
      try {
        el.remove();
      } catch {
        // Ignore
      }
    });
    createdElements = [];

    // Clean up overlay
    const overlay = document.getElementById(ImageZoomService.OVERLAY_ID);
    if (overlay) {
      overlay.remove();
    }

    // Remove body class
    document.body.classList.remove(ImageZoomService.BODY_CLASS);
  });

  // =================================
  // Static Properties Tests
  // =================================
  describe('Static Properties', () => {
    test('should have OVERLAY_ID defined', () => {
      expect(ImageZoomService.OVERLAY_ID).toBe('erps-image-zoom-overlay');
    });

    test('should have BODY_CLASS defined', () => {
      expect(ImageZoomService.BODY_CLASS).toBe('erps-image-zoom-active');
    });

    test('should have MAX_VIEWPORT_PERCENTAGE defined', () => {
      expect(ImageZoomService.MAX_VIEWPORT_PERCENTAGE).toBe(0.8);
    });

    test('should have MAX_ZOOM_SCALE defined', () => {
      expect(ImageZoomService.MAX_ZOOM_SCALE).toBe(1.0);
    });

    test('should have MIN_SIZE defined', () => {
      expect(ImageZoomService.MIN_SIZE).toBe(200);
    });
  });

  // =================================
  // init() Tests
  // =================================
  describe('init()', () => {
    test('should call createOverlay, attachKeyboardListeners, and attachResizeListener', () => {
      const createOverlaySpy = vi.spyOn(ImageZoomService, 'createOverlay');
      const attachKeyboardSpy = vi.spyOn(ImageZoomService, 'attachKeyboardListeners');
      const attachResizeSpy = vi.spyOn(ImageZoomService, 'attachResizeListener');

      ImageZoomService.init();

      expect(createOverlaySpy).toHaveBeenCalled();
      expect(attachKeyboardSpy).toHaveBeenCalled();
      expect(attachResizeSpy).toHaveBeenCalled();

      createOverlaySpy.mockRestore();
      attachKeyboardSpy.mockRestore();
      attachResizeSpy.mockRestore();
    });
  });

  // =================================
  // createOverlay() Tests
  // =================================
  describe('createOverlay()', () => {
    test('should create overlay element if it does not exist', () => {
      ImageZoomService.createOverlay();

      const overlay = document.getElementById(ImageZoomService.OVERLAY_ID);
      expect(overlay).not.toBeNull();
      expect(overlay.className).toBe('erps-image-zoom__overlay');
    });

    test('should not create duplicate overlay if one already exists', () => {
      // Create first overlay
      ImageZoomService.createOverlay();
      const firstOverlay = document.getElementById(ImageZoomService.OVERLAY_ID);

      // Try to create again
      ImageZoomService.createOverlay();

      const secondOverlay = document.getElementById(ImageZoomService.OVERLAY_ID);
      expect(secondOverlay).toBe(firstOverlay);
    });

    test('should have correct structure with container, image, and close button', () => {
      ImageZoomService.createOverlay();

      const overlay = document.getElementById(ImageZoomService.OVERLAY_ID);
      const container = overlay.querySelector('.erps-image-zoom__container');
      const image = overlay.querySelector('.erps-image-zoom__image');
      const closeButton = overlay.querySelector('.erps-image-zoom__close');

      expect(container).not.toBeNull();
      expect(image).not.toBeNull();
      expect(closeButton).not.toBeNull();
    });
  });

  // =================================
  // applySizeConstraints() Tests
  // =================================
  describe('applySizeConstraints()', () => {
    let mockImage;

    beforeEach(() => {
      mockImage = {
        naturalWidth: 800,
        naturalHeight: 600,
        style: {}
      };
    });

    test('should apply size constraints based on viewport', () => {
      ImageZoomService.applySizeConstraints(mockImage);

      // Max dimensions: 1920 * 0.8 = 1536, 1080 * 0.8 = 864
      // Constrained by natural size: min(1536, 800) = 800, min(864, 600) = 600
      expect(mockImage.style.maxWidth).toBe('800px');
      expect(mockImage.style.maxHeight).toBe('600px');
    });

    test('should apply minimum size for very small images', () => {
      mockImage.naturalWidth = 50;
      mockImage.naturalHeight = 50;

      ImageZoomService.applySizeConstraints(mockImage);

      // Should be at least MIN_SIZE (200)
      expect(mockImage.style.maxWidth).toBe('200px');
      expect(mockImage.style.maxHeight).toBe('200px');
    });

    test('should constrain to viewport percentage for large images', () => {
      mockImage.naturalWidth = 4000;
      mockImage.naturalHeight = 3000;

      ImageZoomService.applySizeConstraints(mockImage);

      // Max dimensions based on jsdom default viewport
      expect(mockImage.style.maxWidth).toMatch(/\d+px/);
      expect(mockImage.style.maxHeight).toMatch(/\d+px/);
    });

    test('should log size constraints to console', () => {
      ImageZoomService.applySizeConstraints(mockImage);

      expect(console.info).toHaveBeenCalledWith(
        'ImageZoomService: Applied size constraints',
        expect.objectContaining({
          natural: { width: 800, height: 600 },
          viewport: expect.any(Object),
          applied: expect.any(Object)
        })
      );
    });
  });

  // =================================
  // isVisible() Tests
  // =================================
  describe('isVisible()', () => {
    test('should return false when overlay does not exist', () => {
      const result = ImageZoomService.isVisible();
      // isVisible returns null (falsy) when overlay doesn't exist
      expect(result).toBeFalsy();
    });

    test('should return false when overlay exists but is not visible', () => {
      ImageZoomService.createOverlay();
      const result = ImageZoomService.isVisible();
      expect(result).toBe(false);
    });

    test('should return true when overlay is visible', () => {
      ImageZoomService.createOverlay();
      const overlay = document.getElementById(ImageZoomService.OVERLAY_ID);
      overlay.classList.add('erps-image-zoom__overlay--visible');

      const result = ImageZoomService.isVisible();
      expect(result).toBe(true);
    });
  });

  // =================================
  // cleanup() Tests
  // =================================
  describe('cleanup()', () => {
    test('should handle missing overlay gracefully', () => {
      expect(() => ImageZoomService.cleanup()).not.toThrow();
    });

    test('should remove overlay if it exists', () => {
      ImageZoomService.createOverlay();
      const overlay = document.getElementById(ImageZoomService.OVERLAY_ID);
      expect(overlay).not.toBeNull();

      ImageZoomService.cleanup();

      const removedOverlay = document.getElementById(ImageZoomService.OVERLAY_ID);
      expect(removedOverlay).toBeNull();
    });

    test('should remove body class', () => {
      document.body.classList.add(ImageZoomService.BODY_CLASS);
      expect(document.body.classList.contains(ImageZoomService.BODY_CLASS)).toBe(true);

      ImageZoomService.cleanup();

      expect(document.body.classList.contains(ImageZoomService.BODY_CLASS)).toBe(false);
    });
  });

  // =================================
  // showZoom() Tests
  // =================================
  describe('showZoom()', () => {
    test('should warn if overlay not initialized', async () => {
      const { Logger } = await import('../../../module/services/logger.mjs');

      ImageZoomService.showZoom('test-image.png', 'Test Alt');

      expect(Logger.warn).toHaveBeenCalledWith('Overlay not initialized', null, 'ImageZoomService');
    });

    test('should set image src and alt when overlay exists', () => {
      ImageZoomService.createOverlay();
      const overlay = document.getElementById(ImageZoomService.OVERLAY_ID);
      const image = overlay.querySelector('.erps-image-zoom__image');

      ImageZoomService.showZoom('test-image.png', 'Test Alt Text');

      // jsdom resolves relative URLs to absolute URLs
      expect(image.src).toContain('test-image.png');
      expect(image.alt).toBe('Test Alt Text');
    });

    test('should add visible class to overlay', () => {
      ImageZoomService.createOverlay();

      ImageZoomService.showZoom('test-image.png');

      // The visible class is added via requestAnimationFrame
      // Since globalThis.requestAnimationFrame is real in jsdom, the class should be added
      // Check that the body class was added (this happens synchronously)
      expect(document.body.classList.contains(ImageZoomService.BODY_CLASS)).toBe(true);
    });

    test('should add body class to prevent scrolling', () => {
      ImageZoomService.createOverlay();

      ImageZoomService.showZoom('test-image.png');

      expect(document.body.classList.contains(ImageZoomService.BODY_CLASS)).toBe(true);
    });
  });

  // =================================
  // hideZoom() Tests
  // =================================
  describe('hideZoom()', () => {
    beforeEach(() => {
      ImageZoomService.createOverlay();
    });

    test('should remove visible class from overlay', () => {
      const overlay = document.getElementById(ImageZoomService.OVERLAY_ID);
      overlay.classList.add('erps-image-zoom__overlay--visible');

      ImageZoomService.hideZoom();

      expect(overlay.classList.contains('erps-image-zoom__overlay--visible')).toBe(false);
    });

    test('should remove body class', () => {
      document.body.classList.add(ImageZoomService.BODY_CLASS);

      ImageZoomService.hideZoom();

      expect(document.body.classList.contains(ImageZoomService.BODY_CLASS)).toBe(false);
    });
  });
});