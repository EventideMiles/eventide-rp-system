"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.rollHandler = void 0;

var rollHandler = function rollHandler(dataSet, actor) {
  var rollData, roll, result, label;
  return regeneratorRuntime.async(function rollHandler$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          rollData = actor.getRollData();
          roll = new Roll(dataSet.roll, rollData);
          _context.next = 4;
          return regeneratorRuntime.awrap(roll.evaluate());

        case 4:
          result = _context.sent;
          label = dataSet.label ? "<h3 style=\"color:white;background-color:#512DA8;text-align:center;padding-top:10px;padding-bottom:10px;font-size:1.25em;\">[ability]</h3> ".concat(dataSet.label) : '';
          console.log(rollData.cmax.value);
          console.log(result.terms[0].results[0].result); //style="color:white;background-color:#512DA8;text-align:center;padding-top:10px;padding-bottom:10px;font-size:1.25em;"
          //style="color:white;background-color:#8B0000;text-align:center;padding-top:10px;padding-bottom:10px;font-size:1.25em;"

          if (result.terms[0].results[0].result <= rollData.cmax.value && result.terms[0].results[0].result >= rollData.cmin.value) {
            label = "".concat(label, " <h3 class=\"eventide-critical-hit\"><i class=\"fa-solid fa-meteor\"></i> Critical Hit!</h3>");
          } else if (result.terms[0].results[0].result === 1) {
            label = "".concat(label, " <h3 class=\"eventide-critical-miss\"><i class=\"fa-solid fa-flag\"></i> Critical Miss!</h3>");
          }

          roll.toMessage({
            speaker: ChatMessage.getSpeaker({
              actor: actor
            }),
            flavor: label,
            rollMode: game.settings.get('core', 'rollMode')
          });
          return _context.abrupt("return", roll);

        case 11:
        case "end":
          return _context.stop();
      }
    }
  });
};

exports.rollHandler = rollHandler;