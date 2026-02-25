/**
 * Utilisateur Controller — Barrel re-export
 */
export { rechercherUtilisateurs, getUtilisateur } from './search.js';
export {
  envoyerDemandeAmi,
  annulerDemandeAmi,
  accepterDemandeAmi,
  refuserDemandeAmi,
  supprimerAmi,
  getDemandesAmis,
  getMesAmis,
  getAmisUtilisateur,
  getProjetsSuivisUtilisateur,
} from './friends.js';
