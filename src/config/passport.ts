import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import Utilisateur, { IUtilisateur } from '../models/Utilisateur.js';

/**
 * Configuration des stratégies Passport pour OAuth
 */
export const configurerPassport = (): void => {
  // ============================================
  // STRATÉGIE GOOGLE
  // ============================================
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
          scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Chercher un utilisateur existant avec ce compte Google
            let utilisateur = await Utilisateur.findOne({
              provider: 'google',
              providerId: profile.id,
            });

            if (utilisateur) {
              return done(null, utilisateur);
            }

            // Vérifier si un utilisateur existe avec cet email
            const email = profile.emails?.[0]?.value;
            if (email) {
              utilisateur = await Utilisateur.findOne({ email });
              if (utilisateur) {
                // Lier le compte Google sans écraser le provider local
                if (!utilisateur.providerId) {
                  utilisateur.providerId = profile.id;
                }
                if (profile.photos?.[0]?.value && !utilisateur.avatar) {
                  utilisateur.avatar = profile.photos[0].value;
                }
                await utilisateur.save();
                return done(null, utilisateur);
              }
            }

            // Créer un nouvel utilisateur
            const nouvelUtilisateur = await Utilisateur.create({
              prenom: profile.name?.givenName || 'Utilisateur',
              nom: profile.name?.familyName || 'Google',
              email: email || `google_${profile.id}@lpp.temp`,
              provider: 'google',
              providerId: profile.id,
              avatar: profile.photos?.[0]?.value,
              cguAcceptees: true,
            });

            return done(null, nouvelUtilisateur);
          } catch (error) {
            return done(error as Error, undefined);
          }
        }
      )
    );
    console.log('✅ Stratégie Google OAuth configurée');
  } else {
    console.warn('⚠️ Google OAuth non configuré (credentials manquants)');
  }

  // ============================================
  // STRATÉGIE FACEBOOK
  // ============================================
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/auth/facebook/callback',
          profileFields: ['id', 'displayName', 'name', 'picture.type(large)'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Chercher un utilisateur existant avec ce compte Facebook
            let utilisateur = await Utilisateur.findOne({
              provider: 'facebook',
              providerId: profile.id,
            });

            if (utilisateur) {
              return done(null, utilisateur);
            }

            // Facebook ne fournit pas l'email sans permission avancée
            // Créer un nouvel utilisateur avec email temporaire
            const nouvelUtilisateur = await Utilisateur.create({
              prenom: profile.name?.givenName || profile.displayName?.split(' ')[0] || 'Utilisateur',
              nom: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || 'Facebook',
              email: `facebook_${profile.id}@lpp.temp`,
              provider: 'facebook',
              providerId: profile.id,
              avatar: profile.photos?.[0]?.value,
              cguAcceptees: true,
            });

            return done(null, nouvelUtilisateur);
          } catch (error) {
            return done(error as Error, undefined);
          }
        }
      )
    );
    console.log('✅ Stratégie Facebook OAuth configurée');
  } else {
    console.warn('⚠️ Facebook OAuth non configuré (credentials manquants)');
  }

  // ============================================
  // STRATÉGIE APPLE
  // ============================================
  // Note: Apple OAuth nécessite des credentials Apple Developer
  // Le code ci-dessous est prêt mais nécessite une configuration Apple valide
  if (
    process.env.APPLE_CLIENT_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY
  ) {
    try {
      // Import dynamique pour éviter les erreurs si le module n'est pas installé correctement
      import('passport-apple').then(({ default: AppleStrategy }) => {
        passport.use(
          new AppleStrategy(
            {
              clientID: process.env.APPLE_CLIENT_ID!,
              teamID: process.env.APPLE_TEAM_ID!,
              keyID: process.env.APPLE_KEY_ID!,
              privateKeyString: process.env.APPLE_PRIVATE_KEY!,
              callbackURL: process.env.APPLE_CALLBACK_URL || '/api/auth/apple/callback',
              scope: ['name', 'email'],
            },
            async (
              accessToken: string,
              refreshToken: string,
              idToken: any,
              profile: any,
              done: (error: Error | null, user?: IUtilisateur) => void
            ) => {
              try {
                const appleId = profile.id || idToken?.sub;
                const email = profile.email || idToken?.email;
                const prenom = profile.name?.firstName || 'Utilisateur';
                const nom = profile.name?.lastName || 'Apple';

                let utilisateur = await Utilisateur.findOne({
                  provider: 'apple',
                  providerId: appleId,
                });

                if (utilisateur) {
                  return done(null, utilisateur);
                }

                if (email) {
                  utilisateur = await Utilisateur.findOne({ email });
                  if (utilisateur) {
                    if (!utilisateur.providerId) {
                      utilisateur.providerId = appleId;
                      await utilisateur.save();
                    }
                    return done(null, utilisateur);
                  }
                }

                const nouvelUtilisateur = await Utilisateur.create({
                  prenom,
                  nom,
                  email: email || `apple_${appleId}@lpp.temp`,
                  provider: 'apple',
                  providerId: appleId,
                  cguAcceptees: true,
                });

                return done(null, nouvelUtilisateur);
              } catch (error) {
                return done(error as Error);
              }
            }
          )
        );
        console.log('✅ Stratégie Apple OAuth configurée');
      }).catch(() => {
        console.warn('⚠️ Module passport-apple non disponible');
      });
    } catch {
      console.warn('⚠️ Apple OAuth non configuré (erreur de configuration)');
    }
  } else {
    console.warn('⚠️ Apple OAuth non configuré (credentials manquants)');
  }

  // Sérialisation/Désérialisation (pour sessions si nécessaire)
  passport.serializeUser((user: any, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const utilisateur = await Utilisateur.findById(id);
      done(null, utilisateur);
    } catch (error) {
      done(error, null);
    }
  });
};
