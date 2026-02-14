import { z } from 'zod';

// PENTEST-04: Supprime les balises HTML et les patterns XSS des champs texte
const stripHtml = (val: string): string =>
  val.replace(/<[^>]*>/g, '').replace(/javascript\s*:/gi, '').replace(/on\w+\s*=/gi, '');

/**
 * Schéma de validation pour l'inscription
 */
export const schemaInscription = z.object({
  prenom: z
    .string({
      required_error: 'Le prénom est requis',
    })
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
    .trim()
    .transform(stripHtml),

  nom: z
    .string({
      required_error: 'Le nom est requis',
    })
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .trim()
    .transform(stripHtml),

  email: z
    .string({
      required_error: 'L\'email est requis',
    })
    .email('Veuillez fournir un email valide')
    .toLowerCase()
    .trim(),

  motDePasse: z
    .string({
      required_error: 'Le mot de passe est requis',
    })
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
    ),

  confirmationMotDePasse: z.string({
    required_error: 'La confirmation du mot de passe est requise',
  }),

  cguAcceptees: z
    .boolean({
      required_error: 'Vous devez accepter les CGU',
    })
    .refine((val) => val === true, {
      message: 'Vous devez accepter les conditions générales d\'utilisation',
    }),
}).strict().refine((data) => data.motDePasse === data.confirmationMotDePasse, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmationMotDePasse'],
});

/**
 * Schéma de validation pour la connexion
 */
export const schemaConnexion = z.object({
  email: z
    .string({
      required_error: 'L\'email est requis',
    })
    .email('Veuillez fournir un email valide')
    .toLowerCase()
    .trim(),

  motDePasse: z
    .string({
      required_error: 'Le mot de passe est requis',
    })
    .min(1, 'Le mot de passe est requis'),
});

// Types inférés des schémas
export type DonneesInscription = z.infer<typeof schemaInscription>;
export type DonneesConnexion = z.infer<typeof schemaConnexion>;

/**
 * Formater les erreurs Zod pour le frontend
 */
export const formaterErreursZod = (error: z.ZodError): Record<string, string> => {
  const erreurs: Record<string, string> = {};

  error.errors.forEach((err) => {
    const chemin = err.path.join('.');
    if (!erreurs[chemin]) {
      erreurs[chemin] = err.message;
    }
  });

  return erreurs;
};
