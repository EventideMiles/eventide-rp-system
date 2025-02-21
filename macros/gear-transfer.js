// Check if a token is selected and another is targeted
if (!game.user.targets.size || !canvas.tokens.controlled.length) {
  ui.notifications.warn("Please select a token and target another token");
  return;
}

// Launch the gear transfer application
new erps.macros.GearTransfer().render(true);
