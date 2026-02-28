"use strict";
/**
 * Admin marketplace controller - barrel re-export
 * Endpoints pour le panel de moderation : commandes, services, litiges
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resoudreLitige = exports.listerLitiges = exports.getServiceDetail = exports.listerServices = exports.getCommandesStats = exports.getCommandeDetail = exports.listerCommandes = void 0;
var commandes_js_1 = require("./commandes.js");
Object.defineProperty(exports, "listerCommandes", { enumerable: true, get: function () { return commandes_js_1.listerCommandes; } });
Object.defineProperty(exports, "getCommandeDetail", { enumerable: true, get: function () { return commandes_js_1.getCommandeDetail; } });
Object.defineProperty(exports, "getCommandesStats", { enumerable: true, get: function () { return commandes_js_1.getCommandesStats; } });
var services_js_1 = require("./services.js");
Object.defineProperty(exports, "listerServices", { enumerable: true, get: function () { return services_js_1.listerServices; } });
Object.defineProperty(exports, "getServiceDetail", { enumerable: true, get: function () { return services_js_1.getServiceDetail; } });
var litiges_js_1 = require("./litiges.js");
Object.defineProperty(exports, "listerLitiges", { enumerable: true, get: function () { return litiges_js_1.listerLitiges; } });
Object.defineProperty(exports, "resoudreLitige", { enumerable: true, get: function () { return litiges_js_1.resoudreLitige; } });
//# sourceMappingURL=index.js.map