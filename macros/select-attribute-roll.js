let applyChanges = false;

new Dialog({
  title: `Choose Attribute`,
  content: `<form autocomplete="off">
    <div class="form-group">
      <p>Pick an attribute and it will roll for your 
      selected token.</p>
    </div>
    <div class="form-group">
      <select class="form-inputs" name="attribute-choice">
        <option value="Acrobatics">Acrobatics</option>
        <option value="Physical">Physical</option>
        <option value="Fortitude">Fortitude</option>
        <option value="Will">Will</option>
        <option value="Wits">Wits</option>
      </select>
    </div>
  </form>`,
  buttons: {
    yes: {
      icon: "<i class='fas fa-check'></i>",
      label: `Roll Check`,
      callback: () => (applyChanges = true),
    },
    no: {
      icon: "<i class='fas fa-times'></i>",
      label: `Cancel`,
    },
  },
  default: "yes",
  close: (html) => {
    if (applyChanges) {
      const attributeChoice = html.find('[name="attribute-choice"]')[0].value;
      game.macros.getName(`${attributeChoice}`).execute({ args: [] });
    }
  },
}).render(true);
