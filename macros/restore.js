/**
 * Restore and Remove
 * Allows you to restore a token's health, remove conditions, or both.
 */
const tokenArray = await game.erps.getTargetArray();

if (!tokenArray || tokenArray.length === 0)
  return ui.notifications.error(`Please target a token first!`);

if (tokenArray.length > 1)
  return ui.notifications.error(`You can only target one token at a time!`);

const actor = tokenArray[0].actor;
const statusArray = Array.from(actor.items).filter((i) => i.type === "status");

const defaultOptions = {
  // Options
  restoreResolve: true,
  restorePower: true,
};

const main = (options) => {
  let applyChanges = false;

  new Dialog({
    title: `Restore Target`,
    content: `
    <form autocomplete="off" name="form">
      <hr />
      <div class="form-group">
        <label><strong>Restore Resolve:</strong></label>
        <input type="checkbox" name="restoreResolve" checked="${options.restoreResolve}">
      </div>
      <div class="form-group">
        <label><strong>Restore Power:</strong></label>
        <input type="checkbox" name="restorePower" checked="${options.restorePower}">
      </div>
      <hr />
      <div class="form-group">
        <label><strong>Remove Statuses:</strong></label>
      </div>
      <div class="form-group">
        <label><u><strong>All</strong></u></label>
        <input type="checkbox" name="all">
      </div>
    </form>
    `,
    buttons: {
      yes: {
        icon: "<i class='fas fa-check'></i>",
        label: `Restore`,
        callback: () => (applyChanges = true),
      },
      no: {
        icon: "<i class='fas fa-times'></i>",
        label: `Cancel`,
      },
    },
    default: "yes",
    render: (html) => {
      // if (options.statusNames.length > 0) {
      for (const status of statusArray) {
        if (status.name) {
          html.find(`[name="form"]`)[0].innerHTML += `
            <div class="form-group">
              <label for="${status.id}">${status.name}</label>
              <input type="checkbox" name="${status.name}" id="${status.id}">
            </div>`;
        }
      }
      // }
    },
    close: async (html) => {
      if (applyChanges) {
        const selected = [];
        const resolve = html.find(`[name="restoreResolve"]`)[0].checked;
        const power = html.find(`[name="restorePower"]`)[0].checked;
        const all = html.find(`[name="all"]`)[0].checked;

        if (all) return await actor.restore({ resolve, power, all });

        for (const status of statusArray) {
          if (html.find(`[id="${status.id}"]`)[0].checked)
            selected.push(status);
        }

        await actor.restore({ resolve, power, statuses: selected });
      }
    },
  }).render(true);
};

return await main({ ...defaultOptions });
