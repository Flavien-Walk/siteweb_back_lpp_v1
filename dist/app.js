"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.creerApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const passport_1 = __importDefault(require("passport"));
const cors_js_1 = require("./config/cors.js");
const rateLimiters_js_1 = require("./config/rateLimiters.js");
const authRoutes_js_1 = __importDefault(require("./routes/authRoutes.js"));
const projetRoutes_js_1 = __importDefault(require("./routes/projetRoutes.js"));
const feedRoutes_js_1 = __importDefault(require("./routes/feedRoutes.js"));
const evenementRoutes_js_1 = __importDefault(require("./routes/evenementRoutes.js"));
const notificationRoutes_js_1 = __importDefault(require("./routes/notificationRoutes.js"));
const profilRoutes_js_1 = __importDefault(require("./routes/profilRoutes.js"));
const publicationRoutes_js_1 = __importDefault(require("./routes/publicationRoutes.js"));
const messagerieRoutes_js_1 = __importDefault(require("./routes/messagerieRoutes.js"));
const utilisateurRoutes_js_1 = __importDefault(require("./routes/utilisateurRoutes.js"));
const storyRoutes_js_1 = __importDefault(require("./routes/storyRoutes.js"));
const liveRoutes_js_1 = __importDefault(require("./routes/liveRoutes.js"));
const reportRoutes_js_1 = __importDefault(require("./routes/reportRoutes.js"));
const adminRoutes_js_1 = __importDefault(require("./routes/adminRoutes.js"));
const moderationRoutes_js_1 = __importDefault(require("./routes/moderationRoutes.js"));
const activityRoutes_js_1 = __importDefault(require("./routes/activityRoutes.js"));
const supportTicketRoutes_js_1 = __importDefault(require("./routes/supportTicketRoutes.js"));
const gamificationRoutes_js_1 = __importDefault(require("./routes/gamificationRoutes.js"));
const subscriptionRoutes_js_1 = __importDefault(require("./routes/subscriptionRoutes.js"));
const eventRoutes_js_1 = __importDefault(require("./routes/eventRoutes.js"));
const trendingRoutes_js_1 = __importDefault(require("./routes/trendingRoutes.js"));
const recommendationRoutes_js_1 = __importDefault(require("./routes/recommendationRoutes.js"));
const marketplaceRoutes_js_1 = __importDefault(require("./routes/marketplaceRoutes.js"));
const gestionErreurs_js_1 = require("./middlewares/gestionErreurs.js");
const passport_js_1 = require("./config/passport.js");
const index_js_1 = require("./middlewares/security/index.js");
const emergencyRoutes_js_1 = __importDefault(require("./routes/emergencyRoutes.js"));
/**
 * Créer et configurer l'application Express
 */
const creerApp = () => {
    const app = (0, express_1.default)();
    // ============================================
    // CONFIGURATION PROXY (Render, Heroku, etc.)
    // ============================================
    app.set('trust proxy', 1);
    // ============================================
    // MIDDLEWARES DE SÉCURITÉ
    // ============================================
    // Helmet - headers de sécurité
    app.use((0, helmet_1.default)());
    // Compression gzip pour réduire la taille des réponses
    app.use((0, compression_1.default)());
    // CORS - configuration centralisee dans config/cors.ts
    app.use((0, cors_1.default)(cors_js_1.corsOptions));
    app.options('*', (0, cors_1.default)());
    // ============================================
    // RATE LIMITING (config centralisee dans config/rateLimiters.ts)
    // ============================================
    // Route de sante AVANT les checks securite (monitoring / health check doit toujours repondre)
    app.get('/api/sante', (_req, res) => {
        res.status(200).json({
            succes: true,
            message: 'API La Première Pierre opérationnelle',
            timestamp: new Date().toISOString(),
        });
    });
    // Endpoint d'urgence (AVANT security middleware pour etre accessible meme si IP bloquee)
    app.use('/api/emergency', emergencyRoutes_js_1.default);
    // Middleware de verification IP bloquee (tout en premier)
    app.use('/api/', index_js_1.checkBlockedIP);
    // Middleware de detection d'intrusion (avant les routes, apres le parsing)
    app.use('/api/', index_js_1.securityMonitor);
    // PENTEST-01: Sanitisation des query params (strip operateurs MongoDB $gt, $ne, etc.)
    app.use('/api/', index_js_1.sanitizeQueryParams);
    (0, rateLimiters_js_1.applyRateLimiters)(app);
    // ============================================
    // MIDDLEWARES DE PARSING
    // ============================================
    // Limite pour l'upload de médias base64 (avatars, photos, vidéos)
    // 20MB est suffisant pour images compressées et vidéos courtes
    app.use(express_1.default.json({ limit: '20mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
    // Cookie parser pour les cookies httpOnly (OAuth)
    app.use((0, cookie_parser_1.default)());
    // ============================================
    // SANITISATION MONGODB (VULN-02)
    // ============================================
    // Supprime les operateurs MongoDB ($gt, $ne, $in, etc.)
    // de req.body, req.query et req.params pour empecher
    // les injections NoSQL meme si elles passent le securityMonitor
    app.use((0, express_mongo_sanitize_1.default)({
        replaceWith: '_',
        onSanitize: ({ req, key }) => {
            console.warn(`[MONGO-SANITIZE] Operateur MongoDB supprime dans ${key} depuis ${req.ip} - ${req.originalUrl}`);
        },
    }));
    // ============================================
    // PASSPORT
    // ============================================
    app.use(passport_1.default.initialize());
    (0, passport_js_1.configurerPassport)();
    // ============================================
    // ROUTES
    // ============================================
    // Routes d'authentification
    app.use('/api/auth', authRoutes_js_1.default);
    // Routes métier
    app.use('/api/projets', projetRoutes_js_1.default);
    app.use('/api/feed', feedRoutes_js_1.default);
    app.use('/api/evenements', evenementRoutes_js_1.default);
    app.use('/api/notifications', notificationRoutes_js_1.default);
    app.use('/api/profil', profilRoutes_js_1.default);
    app.use('/api/publications', publicationRoutes_js_1.default);
    app.use('/api/messagerie', messagerieRoutes_js_1.default);
    app.use('/api/utilisateurs', utilisateurRoutes_js_1.default);
    app.use('/api/stories', storyRoutes_js_1.default);
    app.use('/api/live', liveRoutes_js_1.default);
    app.use('/api/reports', reportRoutes_js_1.default);
    app.use('/api/admin', adminRoutes_js_1.default);
    app.use('/api/moderation', moderationRoutes_js_1.default);
    app.use('/api/activity', activityRoutes_js_1.default);
    app.use('/api/support', supportTicketRoutes_js_1.default);
    app.use('/api/gamification', gamificationRoutes_js_1.default);
    app.use('/api/subscriptions', subscriptionRoutes_js_1.default);
    app.use('/api/events', eventRoutes_js_1.default);
    app.use('/api/trending', trendingRoutes_js_1.default);
    app.use('/api/recommendations', recommendationRoutes_js_1.default);
    app.use('/api/marketplace', marketplaceRoutes_js_1.default);
    // ============================================
    // GESTION DES ERREURS
    // ============================================
    // Route non trouvée
    app.use(gestionErreurs_js_1.routeNonTrouvee);
    // Gestion globale des erreurs
    app.use(gestionErreurs_js_1.gestionErreurs);
    return app;
};
exports.creerApp = creerApp;
//# sourceMappingURL=app.js.map