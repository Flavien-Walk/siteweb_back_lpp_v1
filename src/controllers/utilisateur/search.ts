/**
 * Utilisateur Controller — Search & Lookup
 * rechercherUtilisateurs, getUtilisateur
 */
import { Request, Response, NextFunction } from 'express';
import Utilisateur from '../../models/Utilisateur.js';
import { escapeRegex } from '../../utils/strings.js';

/**
 * GET /api/utilisateurs/recherche
 * Rechercher des utilisateurs par nom/prenom
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

    // Limiter la longueur de recherche et echapper les caracteres speciaux regex (protection ReDoS)
    const recherche = escapeRegex(q.trim().slice(0, 100));

    // Recherche par prenom, nom ou combinaison
    const utilisateurs = await Utilisateur.find({
      $and: [
        // Exclure l'utilisateur actuel de la recherche
        ...(userId ? [{ _id: { $ne: userId } }] : []),
        {
          $or: [
            { prenom: { $regex: recherche, $options: 'i' } },
            { nom: { $regex: recherche, $options: 'i' } },
            // Recherche sur nom complet (prenom + nom)
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
      // SEC-SOC-03: Ne pas exposer le role dans la recherche (revele le staff)
      .select('prenom nom avatar statut')
      .limit(limitNum);

    res.json({
      succes: true,
      data: {
        utilisateurs: utilisateurs.map((u) => ({
          _id: u._id,
          prenom: u.prenom,
          nom: u.nom,
          avatar: u.avatar,
          statut: u.statut,
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
 * Inclut le statut d'amitie si l'utilisateur est connecte
 */
export const getUtilisateur = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.utilisateur?._id;

    // PENTEST-09: Ne pas exposer le role (revele le staff)
    const utilisateur = await Utilisateur.findById(id)
      .select('prenom nom avatar bio statut amis demandesAmisRecues demandesAmisEnvoyees dateCreation profilPublic lppPlus');

    if (!utilisateur) {
      res.status(404).json({
        succes: false,
        message: 'Utilisateur non trouvé.',
      });
      return;
    }

    // Determiner le statut d'amitie
    let estAmi = false;
    let demandeEnvoyee = false;
    let demandeRecue = false;
    const estSoiMeme = userId ? userId.toString() === id : false;

    if (userId) {
      const userIdStr = userId.toString();
      estAmi = utilisateur.amis?.some((a) => a.toString() === userIdStr) || false;
      demandeEnvoyee = utilisateur.demandesAmisRecues?.some((d) => d.toString() === userIdStr) || false;
      demandeRecue = utilisateur.demandesAmisEnvoyees?.some((d) => d.toString() === userIdStr) || false;
    }

    // Verifier si le profil est prive et si le demandeur n'est pas ami/soi-meme/staff
    const profilEstPrive = utilisateur.profilPublic === false;
    const estStaff = userId ? await (async () => {
      const u = await Utilisateur.findById(userId).select('role');
      return u ? u.isStaff() : false;
    })() : false;

    // SEC-SOC-02: Profil prive = minimum de donnees exposees
    // Ne pas reveler bio, role, nb amis pour les profils prives
    if (profilEstPrive && !estAmi && !estSoiMeme && !estStaff) {
      res.json({
        succes: true,
        data: {
          utilisateur: {
            _id: utilisateur._id,
            prenom: utilisateur.prenom,
            nom: utilisateur.nom,
            avatar: utilisateur.avatar,
            profilPublic: false,
            estPrive: true,
            estAmi,
            demandeEnvoyee,
            demandeRecue,
          },
        },
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
          bio: utilisateur.bio,
          statut: utilisateur.statut,
          dateInscription: utilisateur.dateCreation,
          profilPublic: utilisateur.profilPublic ?? true,
          nbAmis: utilisateur.amis?.length || 0,
          isVerified: (utilisateur as any).lppPlus?.status === 'active',
          estAmi,
          demandeEnvoyee,
          demandeRecue,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
