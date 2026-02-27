/**
 * Nouvelle commande recue (→ vendeur)
 */
export declare function notifierNouvelleCommande(commandeId: string, serviceNom: string, acheteur: {
    _id: string;
    prenom: string;
    nom: string;
    avatar?: string;
}, vendeurId: string, montant?: string): Promise<void>;
/**
 * Commande acceptee (→ acheteur)
 */
export declare function notifierCommandeAcceptee(commandeId: string, serviceNom: string, vendeur: {
    _id: string;
    prenom: string;
    nom: string;
    avatar?: string;
}, acheteurId: string): Promise<void>;
/**
 * Commande refusee (→ acheteur)
 */
export declare function notifierCommandeRefusee(commandeId: string, serviceNom: string, vendeur: {
    _id: string;
    prenom: string;
    nom: string;
    avatar?: string;
}, acheteurId: string): Promise<void>;
/**
 * Commande livree (→ acheteur)
 */
export declare function notifierCommandeLivree(commandeId: string, serviceNom: string, vendeur: {
    _id: string;
    prenom: string;
    nom: string;
    avatar?: string;
}, acheteurId: string): Promise<void>;
/**
 * Commande terminee / validee (→ vendeur)
 */
export declare function notifierCommandeTerminee(commandeId: string, serviceNom: string, acheteur: {
    _id: string;
    prenom: string;
    nom: string;
    avatar?: string;
}, vendeurId: string): Promise<void>;
/**
 * Demande de revision (→ vendeur)
 */
export declare function notifierRevisionDemandee(commandeId: string, serviceNom: string, acheteur: {
    _id: string;
    prenom: string;
    nom: string;
    avatar?: string;
}, vendeurId: string): Promise<void>;
/**
 * Commande annulee (→ l'autre partie)
 */
export declare function notifierCommandeAnnulee(commandeId: string, serviceNom: string, acteur: {
    _id: string;
    prenom: string;
    nom: string;
    avatar?: string;
}, destinataireId: string): Promise<void>;
/**
 * Litige ouvert (→ l'autre partie)
 */
export declare function notifierLitige(commandeId: string, serviceNom: string, acteur: {
    _id: string;
    prenom: string;
    nom: string;
    avatar?: string;
}, destinataireId: string): Promise<void>;
/**
 * Progression ajoutee (→ acheteur)
 */
export declare function notifierProgressionAjoutee(commandeId: string, serviceNom: string, vendeur: {
    _id: string;
    prenom: string;
    nom: string;
    avatar?: string;
}, acheteurId: string, percent: number): Promise<void>;
/**
 * Deadline prolongee (→ acheteur)
 */
export declare function notifierDeadlineExtended(commandeId: string, serviceNom: string, vendeur: {
    _id: string;
    prenom: string;
    nom: string;
    avatar?: string;
}, acheteurId: string, dureeAjoutee: string): Promise<void>;
/**
 * Commande en retard (→ acheteur + vendeur)
 */
export declare function notifierCommandeEnRetard(commandeId: string, serviceNom: string, vendeur: {
    _id: string;
    prenom: string;
    nom: string;
    avatar?: string;
}, acheteurId: string, vendeurId: string): Promise<void>;
//# sourceMappingURL=orderNotifications.d.ts.map