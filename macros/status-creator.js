const tokenArray = erps.utils.getTargetArray();

if (!tokenArray.length)
  return ui.notifications.error(`Please target a token first`);

const storageKeys = ["status_label", "status_description", "status_image"];

const main = async () => {
  let applyChanges = false;
  let storeData = false;

  new Dialog({
    title: `Custom Status`,
    content: `
  <form autocomplete="off">
    <div class="form-group">
      <p>This script is for creating a custom status message
      and applying the status to your targeted token.</p>
    </div>
    <div class="form-group">
      <label>Label:</label>
      <input name="label" value="">
    </div>
    <div class="form-group">
      <label>Description:</label>
      <input name="description" value="">
    </div>
    <div class="form-group">
      <label>Image:</label>
      <input name="image" value="" type="url">
    </div>
    <div class="form-group">
      <label>Background Color:</label>
      <input name="bgColor" value="#ffffff" type="color">
    </div>
    <div class="form-group">
      <label>Text Color:</label>
      <input name="textColor" value="#000000" type="color">
    </div>
    <div class="form-group">
      <label>Acrobatics Impact:</label>
      <input name="acrobaticsImpact" value="0" type="number" min="0">
    </div>
    <div class="form-group">
      <label>Physical Impact:</label>
      <input name="physicalImpact" value="0" type="number" min="0">
    </div>
    <div class="form-group">
      <label>Fortitude Impact:</label>
      <input name="fortitudeImpact" value="0" type="number" min="0">
    </div>
    <div class="form-group">
      <label>Will Impact:</label>
      <input name="willImpact" value="0" type="number" min="0">
    </div>
    <div class="form-group">
      <label>Wits Impact:</label>
      <input name="witsImpact" value="0" type="number" min="0">
    </div>
    <div class="form-group">
      <label>Roll Impact:</label>
      <input name="rollImpact" value="0" type="number" min="0">
    </div>
    <div class="form-group">
      <label>Critical Max Impact:</label>
      <input name="criticalMaxImpact" value="0" type="number" min="0">
    </div>
    <div class="form-group">
      <label>Critical Min Impact:</label>
      <input name="criticalMinImpact" value="0" type="number" min="0">
    </div>
    <div class="form-group">
      <label>Fail Max Impact:</label>
      <input name="failMaxImpact" value="0" type="number" min="0">
    </div>
    <div class="form-group">
      <label>Fail Min Impact:</label>
      <input name="failMinImpact" value="0" type="number" min="0">
    </div>
  </form>
  `,
    buttons: {
      yes: {
        icon: "<i class='fas fa-bolt'></i>",
        label: `Apply`,
        callback: () => ((applyChanges = true), (storeData = true)),
      },
      store: {
        icon: "<i class='fas fa-hourglass'></i>",
        label: `Store`,
        callback: () => (storeData = true),
      },
      no: {
        icon: "<i class='fas fa-times'></i>",
        label: `Cancel`,
      },
    },
    default: "yes",
    render: async (html) => {
      const storedData = erps.utils.retrieveLocal(storageKeys);

      html
        .find(`[name="label"]`)[0]
        .setAttribute("value", storedData.status_label);
      html
        .find(`[name="description"]`)[0]
        .setAttribute("value", storedData.status_description);
      html
        .find(`[name="image"]`)[0]
        .setAttribute("value", storedData.status_image);
      html
        .find(`[name="bgColor"]`)[0]
        .setAttribute("value", storedData.bgColor);
      html
        .find(`[name="textColor"]`)[0]
        .setAttribute("value", storedData.textColor);
      html
        .find(`[name="acrobaticsImpact"]`)[0]
        .setAttribute("value", storedData.acrobaticsImpact);
      html
        .find(`[name="physicalImpact"]`)[0]
        .setAttribute("value", storedData.physicalImpact);
      html
        .find(`[name="fortitudeImpact"]`)[0]
        .setAttribute("value", storedData.fortitudeImpact);
      html
        .find(`[name="willImpact"]`)[0]
        .setAttribute("value", storedData.willImpact);
      html
        .find(`[name="witsImpact"]`)[0]
        .setAttribute("value", storedData.witsImpact);
      html
        .find(`[name="rollImpact"]`)[0]
        .setAttribute("value", storedData.rollImpact);
      html
        .find(`[name="criticalMaxImpact"]`)[0]
        .setAttribute("value", storedData.criticalMaxImpact);
      html
        .find(`[name="criticalMinImpact"]`)[0]
        .setAttribute("value", storedData.criticalMinImpact);
      html
        .find(`[name="failMaxImpact"]`)[0]
        .setAttribute("value", storedData.failMaxImpact);
      html
        .find(`[name="failMinImpact"]`)[0]
        .setAttribute("value", storedData.failMinImpact);
    },
    close: async (html) => {
      const label = html.find(`[name="label"]`)[0].value || "Status";
      const description = html.find(`[name="description"]`)[0].value || "";
      const image = html.find(`[name="image"]`)[0].value || "";
      const bgColor = html.find(`[name="bgColor"]`)[0].value || "#ffffff";
      const textColor = html.find(`[name="textColor"]`)[0].value || "#000000";
      const acrobaticsImpact =
        Number(html.find(`[name="acrobaticsImpact"]`)[0].value) || 0;
      const physicalImpact =
        Number(html.find(`[name="physicalImpact"]`)[0].value) || 0;
      const fortitudeImpact =
        Number(html.find(`[name="fortitudeImpact"]`)[0].value) || 0;
      const willImpact = Number(html.find(`[name="willImpact"]`)[0].value) || 0;
      const witsImpact = Number(html.find(`[name="witsImpact"]`)[0].value) || 0;
      const rollImpact = Number(html.find(`[name="rollImpact"]`)[0].value) || 0;
      const criticalMaxImpact =
        Number(html.find(`[name="criticalMaxImpact"]`)[0].value) || 0;
      const criticalMinImpact =
        Number(html.find(`[name="criticalMinImpact"]`)[0].value) || 0;
      const failMaxImpact =
        Number(html.find(`[name="failMaxImpact"]`)[0].value) || 0;
      const failMinImpact =
        Number(html.find(`[name="failMinImpact"]`)[0].value) || 0;

      if (applyChanges) {
        for (const token of tokenArray) {
          const statusOptions = {
            label,
            description,
            image,
            system: {
              bgColor,
              textColor,
              acrobaticsImpact,
              physicalImpact,
              fortitudeImpact,
              willImpact,
              witsImpact,
              rollImpact,
              criticalMaxImpact,
              criticalMinImpact,
              failMaxImpact,
              failMinImpact,
            },
          };

          await token.actor.addItem(statusOptions);
        }
      }
      if (storeData) {
        const storageObject = {
          status_label: label,
          status_description: description,
          status_image: image,
          bgColor,
          textColor,
          acrobaticsImpact,
          physicalImpact,
          fortitudeImpact,
          willImpact,
          witsImpact,
          rollImpact,
          criticalMaxImpact,
          criticalMinImpact,
          failMaxImpact,
          failMinImpact,
        };

        erps.utils.storeLocal(storageObject);
      }
    },
  }).render(true);
};

return await main();
