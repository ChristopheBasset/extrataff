# 🚀 ExtraTaff - Projet React

Plateforme de staffing CHR avec matching instantané et recommandations peer-to-peer.

## 📦 Installation

### 1. Prérequis

- **Node.js** 18+ installé ([télécharger](https://nodejs.org/))
- **Git** installé (optionnel)

### 2. Installation des dépendances

Ouvrez un terminal dans le dossier du projet et exécutez :

```bash
npm install
```

### 3. Configuration

Créez un fichier `.env.local` à la racine du projet (copiez `.env.template`) :

```env
VITE_SUPABASE_URL=https://[VOTRE-PROJET].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GOOGLE_MAPS_API_KEY=
VITE_APP_NAME=ExtraTaff
VITE_APP_URL=https://extrataff.fr
```

**Obtenir vos clés Supabase :**
1. Allez sur [supabase.com](https://supabase.com)
2. Ouvrez votre projet
3. Settings → API
4. Copiez **Project URL** et **anon key**

### 4. Lancer le projet

```bash
npm run dev
```

Le site sera accessible sur **http://localhost:5173**

## 📁 Structure du Projet

```
extrataff/
├── src/
│   ├── components/        # Composants réutilisables
│   ├── pages/            # Pages de l'app
│   │   ├── auth/         # Login, Signup
│   │   ├── establishment/# Dashboard établissement
│   │   └── talent/       # Dashboard talent
│   ├── lib/              # Utilitaires
│   │   ├── supabase.js   # Config Supabase
│   │   └── postgis.js    # Géolocalisation
│   ├── hooks/            # Custom hooks React
│   ├── App.jsx           # Composant racine
│   ├── main.jsx          # Point d'entrée
│   └── index.css         # Styles globaux
├── .env.local            # Variables d'environnement (À CRÉER)
├── package.json          # Dépendances
└── vite.config.js        # Config Vite

## 🎯 Prochaines Étapes

### À Développer (selon le Plan d'Adaptation) :

**Jour 2 :**
- [ ] Pages Auth (Login/Signup avec choix rôle)
- [ ] EstablishmentProfileForm
- [ ] TalentProfileForm

**Jour 3 :**
- [ ] MissionForm (création annonce)
- [ ] MissionList & MissionCard
- [ ] ApplicationButton & ApplicationList

**Jour 4 :**
- [ ] Algorithme matching (lib/matching.js)
- [ ] Intégration PostGIS
- [ ] Google Maps Autocomplete

**Jour 5 :**
- [ ] RatingForm & StarRating
- [ ] CancellationModal
- [ ] Tests complets

## 🔧 Scripts Disponibles

```bash
npm run dev      # Lancer en mode développement
npm run build    # Build pour production
npm run preview  # Prévisualiser le build
```

## 📚 Technologies Utilisées

- **React** 18
- **Vite** (bundler ultra-rapide)
- **React Router** (navigation)
- **Supabase** (backend + BDD PostgreSQL + PostGIS)
- **Tailwind CSS** (styling)

## 🆘 Aide

**Si vous avez des erreurs :**

1. Vérifiez que `.env.local` existe et contient vos vraies clés
2. Vérifiez que `npm install` s'est bien passé
3. Essayez `rm -rf node_modules && npm install`

**Pour toute question :** Référez-vous au document `ExtraTaff-Plan-Adaptation-React.md`

---

**Créé le 14 janvier 2026**
**ExtraTaff - L'extra qu'il te faut ⚡**
