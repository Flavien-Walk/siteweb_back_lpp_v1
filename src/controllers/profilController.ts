import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Utilisateur from '../models/Utilisateur.js';
import Notification from '../models/Notification.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';

// Schéma de validation pour la mise à jour du profil
const schemaModifierProfil = z.object({
  prenom: z
    .string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
    .trim()
    .optional(),
  nom: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .trim()
    .optional(),
  email: z
    .string()
    .email('Veuillez fournir un email valide')
    .toLowerCase()
    .trim()
    .optional(),
});

// Schéma de validation pour le changement de mot de passe
const schemaChangerMotDePasse = z.object({
  motDePasseActuel: z.string().min(1, 'Le mot de passe actuel est requis'),
  nouveauMotDePasse: z
    .string()
    .min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
    ),
  confirmationMotDePasse: z.string(),
}).refine((data) => data.nouveauMotDePasse === data.confirmationMotDePasse, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmationMotDePasse'],
});

// Schéma pour la suppression de compte
const schemaSupprimerCompte = z.object({
  motDePasse: z.string().optional(),
  confirmation: z.literal('SUPPRIMER MON COMPTE'),
});

/**
 * PATCH /api/profil
 * Modifier le profil de l'utilisateur
 */
export const modifierProfil = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaModifierProfil.parse(req.body);
    const userId = req.utilisateur!._id;

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (donnees.email) {
      const utilisateurExistant = await Utilisateur.findOne({
        email: donnees.email,
        _id: { $ne: userId },
      });

      if (utilisateurExistant) {
        throw new ErreurAPI('Cette adresse email est déjà utilisée.', 409);
      }
    }

    // Mettre à jour l'utilisateur
    const utilisateur = await Utilisateur.findByIdAndUpdate(
      userId,
      { $set: donnees },
      { new: true, runValidators: true }
    );

    if (!utilisateur) {
      throw new ErreurAPI('Utilisateur non trouvé.', 404);
    }

    res.json({
      succes: true,
      message: 'Profil mis à jour avec succès.',
      data: {
        utilisateur: {
          id: utilisateur._id,
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          email: utilisateur.email,
          avatar: utilisateur.avatar,
          provider: utilisateur.provider,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/profil/mot-de-passe
 * Changer le mot de passe
 */
export const changerMotDePasse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaChangerMotDePasse.parse(req.body);
    const userId = req.utilisateur!._id;

    // Récupérer l'utilisateur avec le mot de passe
    const utilisateur = await Utilisateur.findById(userId).select('+motDePasse');

    if (!utilisateur) {
      throw new ErreurAPI('Utilisateur non trouvé.', 404);
    }

    // Vérifier si l'utilisateur a un compte local
    if (utilisateur.provider !== 'local' && !utilisateur.motDePasse) {
      throw new ErreurAPI(
        `Impossible de changer le mot de passe pour un compte ${utilisateur.provider}.`,
        400
      );
    }

    // Vérifier le mot de passe actuel
    const motDePasseValide = await utilisateur.comparerMotDePasse(donnees.motDePasseActuel);
    if (!motDePasseValide) {
      throw new ErreurAPI('Mot de passe actuel incorrect.', 401);
    }

    // Mettre à jour le mot de passe
    utilisateur.motDePasse = donnees.nouveauMotDePasse;
    await utilisateur.save();

    res.json({
      succes: true,
      message: 'Mot de passe changé avec succès.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/profil
 * Supprimer le compte
 */
export const supprimerCompte = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaSupprimerCompte.parse(req.body);
    const userId = req.utilisateur!._id;

    // Récupérer l'utilisateur avec le mot de passe
    const utilisateur = await Utilisateur.findById(userId).select('+motDePasse');

    if (!utilisateur) {
      throw new ErreurAPI('Utilisateur non trouvé.', 404);
    }

    // Pour les comptes locaux, vérifier le mot de passe
    if (utilisateur.provider === 'local' && utilisateur.motDePasse) {
      if (!donnees.motDePasse) {
        throw new ErreurAPI('Le mot de passe est requis pour supprimer le compte.', 400);
      }

      const motDePasseValide = await utilisateur.comparerMotDePasse(donnees.motDePasse);
      if (!motDePasseValide) {
        throw new ErreurAPI('Mot de passe incorrect.', 401);
      }
    }

    // Supprimer les notifications de l'utilisateur
    await Notification.deleteMany({ destinataire: userId });

    // Supprimer l'utilisateur
    await Utilisateur.findByIdAndDelete(userId);

    res.json({
      succes: true,
      message: 'Compte supprimé avec succès. Nous sommes tristes de te voir partir.',
    });
  } catch (error) {
    next(error);
  }
};
