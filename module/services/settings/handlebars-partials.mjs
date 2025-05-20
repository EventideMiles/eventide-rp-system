const initHandlebarsPartials = async () => {
  const partialPaths = {
    "character-effects":
      "systems/eventide-rp-system/templates/macros/parts/character-effects.hbs",
    "macro-footer":
      "systems/eventide-rp-system/templates/macros/parts/macro-footer.hbs",
    "callout-box":
      "systems/eventide-rp-system/templates/macros/parts/callout-box.hbs",
  };

  // Load and register each partial
  for (const [name, path] of Object.entries(partialPaths)) {
    const template = await fetch(path).then((r) => r.text());
    Handlebars.registerPartial(name, template);
  }
};

export { initHandlebarsPartials };
