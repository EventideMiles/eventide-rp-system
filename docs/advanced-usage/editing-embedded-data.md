# Editing Embedded Data with ProseMirror

This document details the solution to a complex state management problem: editing an object within an array on a parent `Item` document from a separate, temporary `Application` sheet, especially when that object contains a complex component like a `ProseMirror` editor.

## The Scenario

- A "Transformation" `Item` stores an array of "Combat Power" data objects in its system data (`system.embeddedCombatPowers`).
- We want to allow users to click an "Edit" button next to a Combat Power on the Transformation's sheet.
- This should open a new, separate sheet (`EmbeddedCombatPowerSheet`) dedicated to editing only that single Combat Power.
- Changes made in this embedded sheet, including a rich text description using `ProseMirror`, must be saved back to the parent Transformation item reliably.

## The Core Problem: The "Every Other Save" Bug

The primary challenge we faced was a classic but brutal state management issue that manifested as the "every other save" bug. Here's the sequence of events that caused it:

1.  **State Mismatch:** The `EmbeddedCombatPowerSheet` holds a reference to the parent Transformation item (`this.transformationItem`). When a change is saved, the item in the database is updated. However, the `transformationItem` object held in the sheet's memory is now **stale**—it does not reflect the changes that were just saved.
2.  **First Save (Works):** The user saves a change. The data is correctly sent to the database.
3.  **Second Save (Fails):** The user saves a second change. The sheet's save logic reads the **stale** data from its `this.transformationItem` property, modifies it, and saves it. This overwrites the changes from the first save, making it appear as if the save was "discarded".

Attempts to fix this by re-rendering the sheet (`this.render()`) failed because it would destroy and recreate the ProseMirror editor, breaking its internal state and preventing subsequent save events.

## The Definitive Solution

The final solution is a two-part approach that correctly manages state on both the parent (caller) sheet and the child (editor) sheet.

### Part 1: The Parent Sheet (`item-sheet.mjs`)

The parent sheet that opens the editor must be responsible for refreshing itself after the editor is closed. This ensures the user always sees the updated data in the list. This is achieved by overriding the sheet's main click handler, `_onClickAction`, and using a `Hook` to listen for when the embedded sheet closes.

```javascript
// module/ui/sheets/item-sheet.mjs

  /** @override */
  async _onClickAction(event, target) {
    const action = target.dataset.action;
    if (action === "editEmbeddedPower") {
      const powerId = target.closest("[data-item-id]")?.dataset.itemId;
      if (!powerId) return;

      const powerData = this.item.system.embeddedCombatPowers.find(
        (p) => p._id === powerId,
      );

      if (powerData) {
        const embeddedSheet = new EmbeddedCombatPowerSheet(
          powerData,
          this.item,
        );
        // When the embedded sheet is closed, re-render the parent sheet to reflect changes.
        Hooks.once(`close${EmbeddedCombatPowerSheet.name}`, (app) => {
          if (app.id === embeddedSheet.id) {
            this.render(true);
          }
        });
        embeddedSheet.render(true);
      }
    } else {
      return super._onClickAction(event, target);
    }
  }
```

### Part 2: The Embedded Sheet (`embedded-combat-power-sheet.mjs`)

This is where the core of the "every other save" bug is solved. The save handler must ensure that the sheet's local data is updated *before* any asynchronous database operations.

```javascript
// module/ui/sheets/embedded-combat-power-sheet.mjs

  /** @override */
  async _onEditorSave(target, content) {
    const powerIndex =
      this.transformationItem.system.embeddedCombatPowers.findIndex(
        (p) => p._id === this.document.id,
      );
    if (powerIndex === -1) return;

    // Use the full array update, as it's the only data-safe method.
    const powers = foundry.utils.deepClone(
      this.transformationItem.system.embeddedCombatPowers,
    );
    const powerData = powers[powerIndex];
    foundry.utils.setProperty(powerData, target, content);

    try {
      // Pre-emptively update the local source to prevent a race condition.
      // This ensures our data is fresh before we send it to the database.
      this.transformationItem.updateSource({
        "system.embeddedCombatPowers": powers,
      });
      this.document.updateSource(powerData);

      await this.transformationItem.update({
        "system.embeddedCombatPowers": powers,
      });

      ui.notifications.info("Combat Power description saved.");
    } catch (error) {
      Logger.error(
        "EmbeddedCombatPowerSheet | Failed to save description",
        { error, powers, powerData },
        "EMBEDDED_POWER_SHEET",
      );
      ui.notifications.error(
        "Failed to save Combat Power. See console for details.",
      );
    }
  }
```

#### Key Takeaways from the Solution:

1.  **Data-Safe Updates:** For complex nested data, updating the entire array (`"system.embeddedCombatPowers": powers`) proved to be the only method that did not corrupt the data. Targeted "dot-notation" updates were unreliable in this context.
2.  **Pre-emptive State Synchronization:** The key to fixing the stale data issue was to call `this.transformationItem.updateSource(...)` *before* the `await this.transformationItem.update(...)` line. This patches the sheet's in-memory data *before* the asynchronous database call, ensuring that no matter what happens during the `await`, the sheet's state is already correct for the next operation.
3.  **Preserve Editor State:** We must **not** call `this.render()` on the embedded sheet after a ProseMirror save. The editor is a complex component, and re-rendering it breaks its internal state. Simple feedback via `ui.notifications` is the correct approach.
4.  **Parent Responsibility:** The parent sheet is responsible for refreshing its own view after the editing process is complete, which is handled cleanly by the `close` hook.
