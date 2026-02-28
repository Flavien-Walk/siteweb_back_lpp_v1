/**
 * Admin marketplace controller - barrel re-export
 * Endpoints pour le panel de moderation : commandes, services, litiges
 */

export { listerCommandes, getCommandeDetail, getCommandesStats } from './commandes.js';
export { listerServices, getServiceDetail } from './services.js';
export { listerLitiges, resoudreLitige } from './litiges.js';
