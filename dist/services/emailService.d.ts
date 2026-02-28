/**
 * Generer un code de verification 6 chiffres
 */
export declare const genererCodeVerification: () => string;
/**
 * Envoyer un email de verification avec code 6 chiffres
 */
export declare const envoyerEmailVerification: (email: string, prenom: string, code: string) => Promise<void>;
/**
 * Email d'activation LPP+
 * Sujet transactionnel (pas de "!" ni de vocabulaire marketing)
 */
export declare const envoyerEmailLppActivation: (email: string, prenom: string, dateFinPeriode: string) => Promise<void>;
/**
 * Email de resiliation LPP+ (fin de periode)
 */
export declare const envoyerEmailLppResiliation: (email: string, prenom: string, dateFinPeriode: string) => Promise<void>;
/**
 * Email de reactivation LPP+
 */
export declare const envoyerEmailLppReactivation: (email: string, prenom: string) => Promise<void>;
/**
 * Email de fin d'abonnement LPP+
 */
export declare const envoyerEmailLppFin: (email: string, prenom: string) => Promise<void>;
/**
 * Email de renouvellement LPP+
 */
export declare const envoyerEmailLppRenouvellement: (email: string, prenom: string, dateFinPeriode: string) => Promise<void>;
/**
 * Email nouvelle commande recue (→ vendeur)
 */
export declare const envoyerEmailNouvelleCommande: (email: string, prenom: string, serviceNom: string, acheteurPrenom: string, montant: string) => Promise<void>;
/**
 * Email commande acceptee (→ acheteur)
 */
export declare const envoyerEmailCommandeAcceptee: (email: string, prenom: string, serviceNom: string, vendeurPrenom: string) => Promise<void>;
/**
 * Email livraison (→ acheteur)
 */
export declare const envoyerEmailLivraison: (email: string, prenom: string, serviceNom: string, vendeurPrenom: string) => Promise<void>;
/**
 * Email commande terminee (→ vendeur)
 */
export declare const envoyerEmailCommandeTerminee: (email: string, prenom: string, serviceNom: string, acheteurPrenom: string) => Promise<void>;
/**
 * Email deadline prolongee (→ acheteur)
 */
export declare const envoyerEmailDeadlineExtended: (email: string, prenom: string, serviceNom: string, vendeurPrenom: string, dureeAjoutee: string) => Promise<void>;
export declare const envoyerEmailLitigeInitiateur: (email: string, prenom: string, serviceNom: string) => Promise<void>;
export declare const envoyerEmailLitigeReceveur: (email: string, prenom: string, serviceNom: string, initiateurPrenom: string) => Promise<void>;
//# sourceMappingURL=emailService.d.ts.map