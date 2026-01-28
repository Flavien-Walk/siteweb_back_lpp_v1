import { Request, Response, NextFunction } from 'express';
import Utilisateur from '../models/Utilisateur.js';

/**
 * GET /api/utilisateurs/recherche
 * Rechercher des utilisateurs par nom/prénom
 */
export const rechercherUtilisateurs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { q, limit = '10' } = req.query;
    const limitNum = Math.min(20, Math.max(1, parseInt(limit as string, 10)));
    const userId = req.utilisateur?._id;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      res.json({
        succes: true,
        data: {
          utilisateurs: [],
        },
      });
      return;
    }

    const recherche = q.trim();

    // Recherche par prénom, nom ou combinaison
    const utilisateurs = await Utilisateur.find({
      $and: [
        // Exclure l'utilisateur actuel de la recherche
        ...(userId ? [{ _id: { $ne: userId } }] : []),
        {
          $or: [
            { prenom: { $regex: recherche, $options: 'i' } },
            { nom: { $regex: recherche, $options: 'i' } },
            // Recherche sur nom complet (prénom + nom)
            {
              $expr: {
                $regexMatch: {
                  input: { $concat: ['$prenom', ' ', '$nom'] },
                  regex: recherche,
                  options: 'i',
                },
              },
            },
          ],
        },
      ],
    })
      .select('prenom nom avatar')
      .limit(limitNum);

    res.json({
      succes: true,
      data: {
        utilisateurs: utilisateurs.map((u) => ({
          _id: u._id,
          prenom: u.prenom,
          nom: u.nom,
          avatar: u.avatar,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/utilisateurs/:id
 * Obtenir le profil public d'un utilisateur
 */
export const getUtilisateur = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const utilisateur = await Utilisateur.findById(id).select('prenom nom avatar');

    if (!utilisateur) {
      res.status(404).json({
        succes: false,
        message: 'Utilisateur non trouvé.',
      });
      return;
    }

    res.json({
      succes: true,
      data: {
        utilisateur: {
          _id: utilisateur._id,
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          avatar: utilisateur.avatar,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
