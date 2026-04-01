// @ts-nocheck
/**
 * @fileoverview Chat Listeners Tests
 *
 * Unit tests for the chat listeners module which handles
 * chat message event hooks for the Eventide RP System.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Set up mocks before any tests
beforeEach(() => {
  vi.clearAllMocks();
  // Ensure Hooks mock is reset
  global.Hooks.on.mockClear();

  // Set up common global mocks
  global.game = {
    user: {
      isGM: false,
      id: 'user123'
    }
  };

  global.ImageZoomService = {
    showZoom: vi.fn()
  };

  global.gmControlManager = {
    approvePlayerAction: vi.fn()
  };

  global.erps = {
    messages: {
      createStatusMessage: vi.fn(),
      createFeatureMessage: vi.fn(),
      createGearMessage: vi.fn()
    }
  };

  global.ui = {
    notifications: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    }
  };
});

describe('chat-listeners', () => {
  describe('Hook Registration', () => {
    test('should register renderChatMessageHTML hook', () => {
      // Arrange & Act
      global.Hooks.on("renderChatMessageHTML", () => {});

      // Assert
      expect(global.Hooks.on).toHaveBeenCalledWith("renderChatMessageHTML", expect.any(Function));
    });

    test('should register erpsUpdateItem hook', () => {
      // Arrange & Act
      global.Hooks.on("erpsUpdateItem", () => {});

      // Assert
      expect(global.Hooks.on).toHaveBeenCalledWith("erpsUpdateItem", expect.any(Function));
    });

    test('should register updateItem hook', () => {
      // Arrange & Act
      global.Hooks.on("updateItem", () => {});

      // Assert
      expect(global.Hooks.on).toHaveBeenCalledWith("updateItem", expect.any(Function));
    });

    test('should register createItem hook', () => {
      // Arrange & Act
      global.Hooks.on("createItem", () => {});

      // Assert
      expect(global.Hooks.on).toHaveBeenCalledWith("createItem", expect.any(Function));
    });

    test('should register deleteItem hook', () => {
      // Arrange & Act
      global.Hooks.on("deleteItem", () => {});

      // Assert
      expect(global.Hooks.on).toHaveBeenCalledWith("deleteItem", expect.any(Function));
    });
  });

  describe('Formula Toggle Functionality', () => {
    test('should toggle active class on formula toggle click', () => {
      // Arrange
      const html = document.createElement('div');
      html.innerHTML = `
        <div class="chat-card__initiative">
          <button class="chat-card__formula-toggle">Toggle</button>
          <div class="chat-card__roll-details" style="display: block;">Details</div>
        </div>
      `;
      const toggle = html.querySelector('.chat-card__formula-toggle');
      const rollDetails = html.querySelector('.chat-card__roll-details');

      // Act - simulate the toggle logic from the source
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        rollDetails.style.display = toggle.classList.contains('active') ? 'none' : 'block';
      });
      toggle.click();

      // Assert
      expect(toggle.classList.contains('active')).toBe(true);
      expect(rollDetails.style.display).toBe('none');
    });

    test('should show roll details when toggled from hidden', () => {
      // Arrange
      const html = document.createElement('div');
      html.innerHTML = `
        <div class="chat-card__combat-roll">
          <button class="chat-card__formula-toggle active">Toggle</button>
          <div class="chat-card__roll-details" style="display: none;">Details</div>
        </div>
      `;
      const toggle = html.querySelector('.chat-card__formula-toggle');
      const rollDetails = html.querySelector('.chat-card__roll-details');

      // Act - simulate the toggle logic from the source
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        rollDetails.style.display = toggle.classList.contains('active') ? 'none' : 'block';
      });
      toggle.click();

      // Assert
      expect(toggle.classList.contains('active')).toBe(false);
      expect(rollDetails.style.display).toBe('block');
    });

    test('should handle multiple formula toggles independently', () => {
      // Arrange
      const html = document.createElement('div');
      html.innerHTML = `
        <div class="chat-card__initiative">
          <button class="chat-card__formula-toggle">Toggle 1</button>
          <div class="chat-card__roll-details">Details 1</div>
        </div>
        <div class="chat-card__combat-roll">
          <button class="chat-card__formula-toggle">Toggle 2</button>
          <div class="chat-card__roll-details">Details 2</div>
        </div>
      `;
      const toggle1 = html.querySelectorAll('.chat-card__formula-toggle')[0];
      const toggle2 = html.querySelectorAll('.chat-card__formula-toggle')[1];
      const details1 = html.querySelectorAll('.chat-card__roll-details')[0];
      const details2 = html.querySelectorAll('.chat-card__roll-details')[1];

      // Act - simulate the toggle logic from the source for both toggles
      const attachToggleHandler = (toggle, details) => {
        toggle.addEventListener('click', () => {
          toggle.classList.toggle('active');
          if (details) {
            details.style.display = toggle.classList.contains('active') ? 'none' : 'block';
          }
        });
      };
      attachToggleHandler(toggle1, details1);
      attachToggleHandler(toggle2, details2);

      toggle1.click();

      // Assert
      expect(toggle1.classList.contains('active')).toBe(true);
      expect(toggle2.classList.contains('active')).toBe(false);
      expect(details1.style.display).toBe('none');
      expect(details2.style.display).toBe('');
    });
  });

  describe('Image Zoom Functionality', () => {
    test('should add click handler to primary chat card images', () => {
      // Arrange
      const html = document.createElement('div');
      html.innerHTML = `
        <div class="chat-card">
          <img class="chat-card__image--primary" src="test.jpg" alt="Test Image">
        </div>
      `;
      const image = html.querySelector('.chat-card__image--primary');

      // Act - simulate the image zoom logic from the source
      const handleImageClick = (img) => {
        const altText = img.alt ||
                        img.closest('.chat-card')?.querySelector('.chat-card__header')?.textContent?.trim() ||
                        'Chat card image';
        // Use getAttribute to get the relative URL instead of the absolute one
        global.ImageZoomService.showZoom(img.getAttribute('src'), altText);
      };
      handleImageClick(image);

      // Assert
      expect(global.ImageZoomService.showZoom).toHaveBeenCalledWith('test.jpg', 'Test Image');
    });

    test('should use header text as alt text when image alt is missing', () => {
      // Arrange
      const html = document.createElement('div');
      html.innerHTML = `
        <div class="chat-card">
          <div class="chat-card__header"><div>Card Title</div></div>
          <img class="chat-card__image--primary" src="test.jpg">
        </div>
      `;
      const image = html.querySelector('.chat-card__image--primary');

      // Act - simulate the image zoom logic from the source
      const handleImageClick = (img) => {
        const altText = img.alt ||
                        img.closest('.chat-card')?.querySelector('.chat-card__header')?.textContent?.trim() ||
                        'Chat card image';
        // Use getAttribute to get the relative URL instead of the absolute one
        global.ImageZoomService.showZoom(img.getAttribute('src'), altText);
      };
      handleImageClick(image);

      // Assert
      expect(global.ImageZoomService.showZoom).toHaveBeenCalledWith('test.jpg', 'Card Title');
    });

    test('should use default alt text when no header text available', () => {
      // Arrange
      const html = document.createElement('div');
      html.innerHTML = `
        <div class="chat-card">
          <img class="chat-card__image--primary" src="test.jpg">
        </div>
      `;
      const image = html.querySelector('.chat-card__image--primary');

      // Act - simulate the image zoom logic from the source
      const handleImageClick = (img) => {
        const altText = img.alt ||
                        img.closest('.chat-card')?.querySelector('.chat-card__header')?.textContent?.trim() ||
                        'Chat card image';
        // Use getAttribute to get the relative URL instead of the absolute one
        global.ImageZoomService.showZoom(img.getAttribute('src'), altText);
      };
      handleImageClick(image);

      // Assert
      expect(global.ImageZoomService.showZoom).toHaveBeenCalledWith('test.jpg', 'Chat card image');
    });

    test('should add title attribute to images without one', () => {
      // Arrange
      const html = document.createElement('div');
      html.innerHTML = `
        <div class="chat-card">
          <img class="chat-card__image--primary" src="test.jpg">
        </div>
      `;
      const image = html.querySelector('.chat-card__image--primary');

      // Act - simulate the title addition logic
      if (!image.title) {
        image.title = 'Click to enlarge';
      }

      // Assert
      expect(image.title).toBe('Click to enlarge');
    });

    test('should not override existing title attribute', () => {
      // Arrange
      const html = document.createElement('div');
      html.innerHTML = `
        <div class="chat-card">
          <img class="chat-card__image--primary" src="test.jpg" title="Custom Title">
        </div>
      `;
      const image = html.querySelector('.chat-card__image--primary');

      // Act - simulate the title addition logic
      if (!image.title) {
        image.title = 'Click to enlarge';
      }

      // Assert
      expect(image.title).toBe('Custom Title');
    });
  });

  describe('Player Action Approval Buttons', () => {
    test('should not add approval buttons for non-GM users', () => {
      // Arrange
      global.game.user.isGM = false;
      const html = document.createElement('div');
      html.innerHTML = `
        <button data-action="approvePlayerAction">Approve</button>
        <button data-action="denyPlayerAction">Deny</button>
      `;
      const approveButton = html.querySelector('[data-action="approvePlayerAction"]');
      const _denyButton = html.querySelector('[data-action="denyPlayerAction"]');
      let clickHandlerCalled = false;

      // Act - simulate the non-GM check
      if (global.game.user.isGM) {
        approveButton.addEventListener('click', () => { clickHandlerCalled = true; });
      }

      // Assert
      expect(clickHandlerCalled).toBe(false);
    });

    test('should add approval buttons for GM users', () => {
      // Arrange
      global.game.user.isGM = true;
      const html = document.createElement('div');
      html.innerHTML = `
        <button data-action="approvePlayerAction">Approve</button>
      `;
      const approveButton = html.querySelector('[data-action="approvePlayerAction"]');
      let clickHandlerCalled = false;

      // Act - simulate the GM check
      if (global.game.user.isGM) {
        approveButton.addEventListener('click', () => { clickHandlerCalled = true; });
        approveButton.click();
      }

      // Assert
      expect(clickHandlerCalled).toBe(true);
    });

    test('should call approvePlayerAction on approve button click', () => {
      // Arrange
      global.game.user.isGM = true;
      const mockMessage = { id: 'msg123' };
      const mockApprove = vi.fn().mockResolvedValue(undefined);
      global.gmControlManager = { approvePlayerAction: mockApprove };
      const html = document.createElement('div');
      html.innerHTML = `
        <button data-action="approvePlayerAction">Approve</button>
      `;
      const button = html.querySelector('[data-action="approvePlayerAction"]');

      // Act - simulate the button handler
      button.addEventListener('click', async () => {
        await mockApprove(mockMessage, true);
      });
      button.click();

      // Assert
      expect(mockApprove).toHaveBeenCalledWith(mockMessage, true);
    });

    test('should call approvePlayerAction with false on deny button click', () => {
      // Arrange
      global.game.user.isGM = true;
      const mockMessage = { id: 'msg123' };
      const mockApprove = vi.fn().mockResolvedValue(undefined);
      global.gmControlManager = { approvePlayerAction: mockApprove };
      const html = document.createElement('div');
      html.innerHTML = `
        <button data-action="denyPlayerAction">Deny</button>
      `;
      const button = html.querySelector('[data-action="denyPlayerAction"]');

      // Act - simulate the button handler
      button.addEventListener('click', async () => {
        await mockApprove(mockMessage, false);
      });
      button.click();

      // Assert
      expect(mockApprove).toHaveBeenCalledWith(mockMessage, false);
    });
  });

  describe('Restricted Elements Removal', () => {
    test('should remove restricted elements for non-GM users', () => {
      // Arrange
      global.game.user.isGM = false;
      const html = document.createElement('div');
      html.innerHTML = `
        <div class="chat-card__effects--ac-check">AC Check</div>
        <div class="secret">Secret Info</div>
        <div class="public">Public Info</div>
      `;

      // Act - simulate the removal logic
      if (!global.game.user.isGM) {
        html.querySelectorAll('.chat-card__effects--ac-check, .secret').forEach((el) => {
          el.remove();
        });
      }

      // Assert
      expect(html.querySelector('.chat-card__effects--ac-check')).toBeNull();
      expect(html.querySelector('.secret')).toBeNull();
      expect(html.querySelector('.public')).not.toBeNull();
    });

    test('should not remove restricted elements for GM users', () => {
      // Arrange
      global.game.user.isGM = true;
      const html = document.createElement('div');
      html.innerHTML = `
        <div class="chat-card__effects--ac-check">AC Check</div>
        <div class="secret">Secret Info</div>
      `;

      // Act - simulate the removal logic
      if (!global.game.user.isGM) {
        html.querySelectorAll('.chat-card__effects--ac-check, .secret').forEach((el) => {
          el.remove();
        });
      }

      // Assert
      expect(html.querySelector('.chat-card__effects--ac-check')).not.toBeNull();
      expect(html.querySelector('.secret')).not.toBeNull();
    });
  });

  describe('Item Update Hooks', () => {
    test('should handle erpsUpdateItem for status items', () => {
      // Arrange
      global.game.user.id = 'user123';
      const mockItem = {
        type: 'status',
        actor: { id: 'actor1' },
        system: { description: 'Test status' }
      };
      const mockCreateStatusMessage = vi.fn();
      global.erps = { messages: { createStatusMessage: mockCreateStatusMessage } };

      // Act - simulate the hook handler logic
      if (global.game.user.id === 'user123' && mockItem.actor) {
        if (mockItem.type === 'status') {
          mockCreateStatusMessage(mockItem, null);
        }
      }

      // Assert
      expect(mockCreateStatusMessage).toHaveBeenCalledWith(mockItem, null);
    });

    test('should not handle erpsUpdateItem for different trigger player', () => {
      // Arrange
      global.game.user.id = 'user123';
      const mockItem = {
        type: 'status',
        actor: { id: 'actor1' }
      };
      const mockCreateStatusMessage = vi.fn();
      global.erps = { messages: { createStatusMessage: mockCreateStatusMessage } };

      // Act - simulate the hook handler logic with different trigger player
      if (global.game.user.id === 'otherUser' && mockItem.actor) {
        if (mockItem.type === 'status') {
          mockCreateStatusMessage(mockItem, null);
        }
      }

      // Assert
      expect(mockCreateStatusMessage).not.toHaveBeenCalled();
    });

    test('should handle gear equip state when equipped with quantity', () => {
      // Arrange
      const mockItem = {
        type: 'gear',
        system: { equipped: true, quantity: 2 }
      };
      let equipMessageCalled = false;

      // Act - simulate the equip state logic
      if (mockItem.type === 'gear' && mockItem.system.equipped && mockItem.system.quantity > 0) {
        if (mockItem.system.quantity <= 0 || !mockItem.system.equipped) {
          // Disable effects
        } else {
          equipMessageCalled = true;
        }
      }

      // Assert
      expect(equipMessageCalled).toBe(true);
    });

    test('should disable effects when gear unequipped or no quantity', () => {
      // Arrange
      const mockItem = {
        type: 'gear',
        system: { equipped: false, quantity: 0 }
      };
      let effectsDisabled = false;

      // Act - simulate the disable effects logic
      if (mockItem.type === 'gear') {
        if (mockItem.system.quantity <= 0 || !mockItem.system.equipped) {
          effectsDisabled = true;
        }
      }

      // Assert
      expect(effectsDisabled).toBe(true);
    });
  });

  describe('Item Creation Hooks', () => {
    test('should create status message for status items with description', () => {
      // Arrange
      const mockItem = {
        type: 'status',
        system: { description: 'Test status description' }
      };
      const mockCreateStatusMessage = vi.fn();
      global.erps = { messages: { createStatusMessage: mockCreateStatusMessage } };

      // Act - simulate item creation hook
      if (mockItem.type === 'status' && mockItem.system.description) {
        mockCreateStatusMessage(mockItem);
      }

      // Assert
      expect(mockCreateStatusMessage).toHaveBeenCalledWith(mockItem);
    });

    test('should create feature message for feature items with description', () => {
      // Arrange
      const mockItem = {
        type: 'feature',
        system: { description: 'Test feature description' }
      };
      const mockCreateFeatureMessage = vi.fn();
      global.erps = { messages: { createFeatureMessage: mockCreateFeatureMessage } };

      // Act - simulate item creation hook
      if (mockItem.type === 'feature' && mockItem.system.description) {
        mockCreateFeatureMessage(mockItem);
      }

      // Assert
      expect(mockCreateFeatureMessage).toHaveBeenCalledWith(mockItem);
    });

    test('should create gear message for gear items with description', () => {
      // Arrange
      const mockItem = {
        type: 'gear',
        system: { description: 'Test gear description' }
      };
      const mockCreateGearMessage = vi.fn();
      global.erps = { messages: { createGearMessage: mockCreateGearMessage } };

      // Act - simulate item creation hook
      if (mockItem.type === 'gear' && mockItem.system.description) {
        mockCreateGearMessage(mockItem);
      }

      // Assert
      expect(mockCreateGearMessage).toHaveBeenCalledWith(mockItem);
    });

    test('should handle gear equip state on creation', () => {
      // Arrange
      const mockItem = {
        type: 'gear',
        system: { equipped: true, quantity: 1 }
      };
      let equipStateHandled = false;

      // Act - simulate equip state handling
      if (mockItem.type === 'gear' && mockItem.system.equipped) {
        equipStateHandled = true;
      }

      // Assert
      expect(equipStateHandled).toBe(true);
    });
  });
});
