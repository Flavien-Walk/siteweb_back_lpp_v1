# RGPD COMPLIANCE - CELSE / La Premiere Pierre

> Version: 1.0 | Date: 2026-02-13
> Responsable: Data Protection Officer
> Cadre: Reglement General sur la Protection des Donnees (UE 2016/679)

---

## 1. Donnees personnelles collectees

### 1.1 Donnees d'identite (Art. 6.1.b - Execution contrat)
| Champ | Obligatoire | Source | Retention |
|-------|-------------|--------|-----------|
| Prenom | Oui | Inscription | Jusqu'a suppression compte |
| Nom | Oui | Inscription | Jusqu'a suppression compte |
| Email | Oui | Inscription | Jusqu'a suppression compte |
| Mot de passe (hash bcrypt) | Oui (local) | Inscription | Jusqu'a suppression compte |
| Avatar | Non | Profil | Jusqu'a suppression compte |
| Bio | Non | Profil | Jusqu'a suppression compte |

### 1.2 Donnees OAuth (Art. 6.1.b)
| Champ | Source | Retention |
|-------|--------|-----------|
| Provider (google/facebook/apple) | OAuth | Jusqu'a suppression |
| ProviderId | OAuth | Jusqu'a suppression |

### 1.3 Donnees de contenu (Art. 6.1.b)
| Type | Retention |
|------|-----------|
| Publications (texte + media) | Jusqu'a suppression manuelle ou du compte |
| Commentaires | Jusqu'a suppression manuelle ou du compte |
| Messages (chiffres AES-256-GCM) | Jusqu'a suppression conversation ou du compte |
| Stories | Auto-expiration (configurable) + suppression compte |
| Projets | Jusqu'a suppression manuelle ou du compte |

### 1.4 Donnees de moderation (Art. 6.1.f - Interet legitime)
| Type | Retention |
|------|-----------|
| Avertissements (warnings) | Jusqu'a suppression compte |
| Suspensions | Jusqu'a suppression compte |
| Signalements emis | Anonymises a la suppression compte |
| Audit logs | Anonymises a la suppression compte |

### 1.5 Donnees techniques (Art. 6.1.f)
| Type | Retention |
|------|-----------|
| Token JWT | 7 jours (TTL) |
| Token blacklist | Expire avec le JWT (TTL MongoDB) |
| Notifications | 90 jours apres lecture (TTL MongoDB) |

---

## 2. Bases legales

| Traitement | Base legale | Article RGPD |
|------------|-------------|--------------|
| Creation de compte | Execution contrat | Art. 6.1.b |
| Publications/commentaires | Execution contrat | Art. 6.1.b |
| Messagerie | Execution contrat | Art. 6.1.b |
| Moderation de contenu | Interet legitime | Art. 6.1.f |
| Signalements | Interet legitime | Art. 6.1.f |
| Audit logs | Obligation legale | Art. 6.1.c |
| CGU acceptance | Consentement | Art. 6.1.a |

---

## 3. Droits des personnes concernees

### 3.1 Droit d'acces (Art. 15) - IMPLEMENTE
- **Endpoint**: `GET /api/profil/export`
- **Contenu de l'export**:
  - Profil complet (identite, bio, avatar, role, date inscription)
  - Publications (contenu, date, nombre de likes)
  - Commentaires (contenu, date, publication associee)
  - Notifications (type, titre, date, statut lecture)
  - Projets crees (nom, description, categorie, statut)
  - Signalements emis (type, raison, statut)
  - Conversations (type, nombre)
  - Stories (type, date creation, date expiration, nombre de vues)
  - Likes effectues (publications likees)
  - Projets suivis

### 3.2 Droit a l'effacement (Art. 17) - IMPLEMENTE
- **Endpoint**: `DELETE /api/profil`
- **Confirmation**: Requiert `confirmation: "SUPPRIMER MON COMPTE"` + mot de passe
- **Cascade de suppression**:
  - Notifications recues et creees
  - Publications et commentaires
  - Likes sur publications et commentaires
  - Messages envoyes et statuts de lecture
  - Conversations (1-1 supprimees, groupes: retrait participant)
  - Stories
  - Vues de stories d'autres utilisateurs
  - Followers de projets
  - Listes d'amis et demandes en attente
  - Audit logs anonymises (performedBy -> null)
  - Reports anonymises (reporter -> null)
  - Compte utilisateur

### 3.3 Droit a la rectification (Art. 16) - IMPLEMENTE
- **Endpoint**: `PATCH /api/profil`
- **Champs modifiables**: prenom, nom, email, bio, avatar, profilPublic

### 3.4 Droit a la portabilite (Art. 20) - IMPLEMENTE
- **Format**: JSON structure
- **Endpoint**: `GET /api/profil/export`

### 3.5 Droit d'opposition (Art. 21)
- **Profil prive**: `PATCH /api/profil` avec `profilPublic: false`
- Reduit les donnees exposees au minimum (prenom, nom, avatar uniquement)

---

## 4. Mesures techniques de protection

### 4.1 Chiffrement
- Mots de passe: bcrypt salt rounds 12
- Messages: AES-256-GCM
- Transport: HTTPS (TLS 1.2+)
- Tokens: JWT HS256 avec secret securise

### 4.2 Controle d'acces
- RBAC: 5 roles, 17 permissions granulaires
- JWT verification sur chaque requete authentifiee
- Ban/suspend check dans middleware
- Hierarchie des roles (modo < admin < super_admin)

### 4.3 Minimisation des donnees (Art. 5.1.c)
- Recherche utilisateurs: seuls prenom, nom, avatar, statut exposes
- Profil prive: bio, role, nombre d'amis masques
- Logs: PII redactees ([EMAIL], [TOKEN])
- API: champs selectionnes par .select() sur chaque requete

### 4.4 Retention limitee (Art. 5.1.e)
- Notifications lues: TTL 90 jours (auto-suppression MongoDB)
- Tokens blacklistes: TTL aligne sur expiration JWT
- Stories: expiration configurable (auto-suppression)
- Rate limit maps: nettoyage periodique en memoire

### 4.5 Journalisation (Art. 30)
- Audit logs immutables pour toutes les actions de moderation
- Idempotency via eventId (pas de double-logging)
- Anonymisation automatique lors de la suppression de compte

---

## 5. Conformite implementation

| Exigence | Statut | Implementation |
|----------|--------|----------------|
| Consentement CGU | OK | cguAcceptees lors inscription |
| DSAR complet | OK | /api/profil/export avec 10 categories |
| Droit suppression | OK | DELETE /api/profil avec cascade complete |
| Minimisation | OK | .select() systematique, profil prive |
| Retention limitee | OK | TTL MongoDB sur notifications, tokens |
| Chiffrement transit | OK | HTTPS obligatoire |
| Chiffrement repos | OK | Messages AES-256-GCM |
| Journalisation | OK | AuditLog immutable |
| Anonymisation | OK | Audit logs + reports anonymises a la suppression |
| Consentement granulaire | PLANIFIE | Prevu Phase P2 (analytics, marketing) |
| Blocage utilisateurs | PLANIFIE | Prevu Phase P2 |

---

## 6. Points d'amelioration identifies (Roadmap)

1. **Consentement granulaire** (P2): Ajouter des toggles pour analytics, marketing, personalisation
2. **Registre des traitements** (P2): Document formel Art. 30
3. **DPO contact** (P2): Formulaire de contact DPO dans l'application
4. **Notification de breach** (P2): Procedure Art. 33/34 documentee
5. **DPIA** (P2): Analyse d'impact pour le traitement a grande echelle
