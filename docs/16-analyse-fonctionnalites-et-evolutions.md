# Analyse des fonctionnalités actuelles et idées d'évolution

Ce document décrit ce que fait **NewApp** aujourd'hui, puis propose des **nouvelles fonctionnalités réalistes** à implémenter en s'appuyant sur l'architecture existante (hooks, composants, services).

---

## 1. Vue d'ensemble

NewApp est une application React + Node.js connectée à **Dolibarr** (employés, salaires, paiements) avec une base **SQLite locale** pour les jours fériés.

| Zone | Rôle |
|------|------|
| **Frontoffice** | Consultation salariés, création/paiement salaires, génération en masse |
| **Backoffice** (protégé) | Dashboard, imports CSV/ZIP, jours fériés, réinitialisation Dolibarr |

---

## 2. Fonctionnalités actuelles (détail)

### 2.1 Employés (Frontoffice)

| Fonctionnalité | Route | Ce qui existe |
|----------------|-------|---------------|
| Liste simple | `/frontoffice/salaries/liste` | Tous les employés Dolibarr, liens vers fiche |
| Recherche filtrée | `/frontoffice/salaries/recherche` | Filtres : ref, nom, login, genre, poste |
| Fiche salarié | `/frontoffice/salaries/:id` | Infos + historique salaires + paiements + totaux |

**Composants réutilisables :** `TableauEmployes`

---

### 2.2 Création et paiement de salaire (Frontoffice)

| Fonctionnalité | Route | Ce qui existe |
|----------------|-------|---------------|
| Créer un salaire | `/frontoffice/salaires/nouveau` | Formulaire : employé, ref, libellé, dates, montant |
| Payer un salaire | (même page) | Sélection salaire impayé + plusieurs lignes de paiement |
| Pré-sélection employé | `?employeeId=…` | Depuis liste ou recherche |

**Logique :**
- Un salaire a un **montant total** et un **reste à payer**
- Les paiements sont cumulés ; on ne peut pas dépasser le montant du salaire
- Pas de notion de **pourcentage** aujourd'hui : on saisit des montants en euros

**Fichiers clés :** `useCreationEtPaiementSalaire`, `FormulaireCreationSalaire`, `SectionPaiementSalaire`, `serviceSalaire.js`

---

### 2.3 Génération de salaires en masse (Frontoffice)

| Mode | Route | Règle de calcul |
|------|-------|-----------------|
| **Classique** | `/frontoffice/salaires/generer` | Même montant fixe pour tous, période date début → date fin |
| **Mensuel** | `/frontoffice/salaires/generer-mois` | `(jours non payés × salaire/jour) + (jours fériés non payés × salaire/jour)` |
| **Mensuel week-end** | `/frontoffice/salaires/generer-mois-weekend` | Idem + samedi/dimanche travaillés × **3** si cochés |

**Points importants :**
- Sélection employés par filtres (poste, genre, etc.)
- Les **jours fériés** viennent de SQLite et impactent le calcul mensuel
- Les jours déjà couverts par un salaire existant sont **ignorés** (skipped)
- Résultats : créés / ignorés / échecs

**Fichiers clés :** `PageGenerationSalairesMensuels`, `calculateurSalaireMensuel.js`, `serviceSalairesMensuelsMasse.js`, `holidayService.js`

---

### 2.4 Paiement en masse mensuel (Frontoffice)

| Fonctionnalité | Route | Ce qui existe |
|----------------|-------|---------------|
| Paiement budget | `/frontoffice/salaires/paiement-mois` | Budget fixe + poste prioritaire + mois/année |

**Règle actuelle :**
1. Récupère les salaires avec **reste à payer** qui chevauchent le mois choisi
2. Trie : **poste prioritaire en premier**, puis par date de début de salaire
3. Paie chaque salaire jusqu'à épuisement du budget (montant = min(reste, budget restant))
4. **Pas de pourcentage** : paiement du maximum possible ou du reste

**Fichiers clés :** `usePaiementMensuelMasse`, `servicePaiementsMensuelsMasse.js`

---

### 2.5 Jours fériés (Backoffice)

| Fonctionnalité | Route | Ce qui existe |
|----------------|-------|---------------|
| CRUD jours fériés | `/backoffice/jours-feries` | Date + libellé, stockés en SQLite |

**Usage actuel :**
- Utilisés **uniquement** dans le calcul du salaire mensuel (bonus = +1 jour de salaire/jour par férié non payé)
- Pas d'import CSV des jours fériés
- Pas de récurrence annuelle (ex. « 1er mai » chaque année)
- Pas de prévisualisation « combien de jours fériés dans le mois X »

**Fichiers clés :** `useJoursFeries`, `holidayService.js`, `listHolidaysInMonth()`

---

### 2.6 Backoffice (autres)

| Fonctionnalité | Description |
|----------------|-------------|
| Dashboard | Stats salaires par genre et par mois (graphiques) |
| Import employés CSV | ref, nom, genre, login, mdp, heures, poste |
| Import salaires CSV | ref salaire, ref employé, dates, montant, paiements |
| Import images ZIP | Photos employés → dossier Dolibarr |
| Réinitialisation | Vide les tables Dolibarr (sauf config/admin) |

---

## 3. Ce qui n'existe PAS encore (lacunes utiles pour de nouvelles features)

| Sujet | État actuel |
|-------|-------------|
| Paiement en **%** du salaire | Non — montants fixes uniquement |
| Paiement en % du **budget** global | Non |
| Prévisualisation avant génération mensuelle | Non — on génère directement |
| Import jours fériés (CSV ou calendrier) | Non — saisie manuelle |
| Plafond / plancher salaire mensuel | Non |
| Absences / congés déduits du calcul | Non |
| Export PDF / Excel des résultats | Non |
| Notification / alerte reste à payer | Non |

---

## 4. Exemples de nouvelles fonctionnalités (avec mode d'implémentation)

Chaque exemple indique **quoi réutiliser** pour éviter de réécrire du long code.

---

### Exemple A — Paiement en pourcentage du reste à payer

**Besoin métier :**  
« Je veux payer **50 %** du reste à payer de chaque salaire éligible, au lieu de tout solder ou saisir un montant fixe. »

**Où ça s'intègre :**  
Extension de la page **Paiement en masse mensuel** ou de **Créer et payer un salaire**.

**Comportement proposé :**
- Nouveau champ : `mode_paiement` = `montant` | `pourcentage`
- Si `pourcentage` : champ `taux` (ex. 50 pour 50 %)
- Montant payé = `reste × (taux / 100)`, arrondi à 2 décimales
- Validation : taux entre 1 et 100

**Implémentation (architecture actuelle) :**

```
Frontend
  FormulairePaiementMensuel.jsx     → ajouter select mode + input %
  usePaiementMensuelMasse.js        → inclure mode/taux dans le payload

Backend
  servicePaiementsMensuelsMasse.js  → remplacer min(reste, budget) par :
                                       montant = min(reste * taux/100, budget_restant)
  (optionnel) serviceSalaire.js     → même logique pour paiement unitaire
```

**Effort estimé :** faible — ~80 lignes, pas de nouvelle page.

---

### Exemple B — Paiement en pourcentage du budget par poste

**Besoin métier :**  
« J'ai 10 000 €. Le poste **Comptable** reçoit **60 %** du budget, le reste pour les autres postes. »

**Comportement proposé :**
- Budget total + répartition par poste (tableau poste → %)
- Les % doivent faire 100 % (ou normalisation auto)
- Pour chaque poste : sous-budget = budget × %/100, puis paiement comme aujourd'hui (priorité par date)

**Implémentation :**

```
Frontend
  FormulairePaiementMensuel.jsx     → section « Répartition par poste »
  usePaiementMensuelMasse.js        → charger jobOptions (déjà fait), état repartition

Backend
  servicePaiementsMensuelsMasse.js  → boucle par poste avec sous-budget
```

**Effort estimé :** moyen — ~150 lignes, réutilise tout le tri/paiement existant.

---

### Exemple C — Prévisualisation salaire mensuel (sans créer)

**Besoin métier :**  
« Avant de générer, je veux voir pour chaque employé : jours comptés, jours fériés, montant calculé. »

**Comportement proposé :**
- Bouton **Prévisualiser** à côté de **Générer**
- Appel API en lecture seule → tableau montants sans écriture Dolibarr
- Le backend a déjà `previsualiserSalairesMensuelsEnMasse` dans `serviceSalairesMensuelsMasse.js`

**Implémentation :**

```
Frontend
  PageGenerationSalairesMensuels.jsx  → bouton + état preview
  salaires.api.js                     → previsualiserSalairesMensuels()
  ResultatsSalairesTableau.jsx        → mode preview (déjà presque compatible)

Backend
  Route GET ou POST /salaries/bulk-monthly/preview
  Controller + exposer previsualiserSalairesMensuelsEnMasse
```

**Effort estimé :** faible — la logique métier existe déjà côté backend.

---

### Exemple D — Import CSV des jours fériés

**Besoin métier :**  
« J'ai un fichier avec toutes les fêtes de l'année, je ne veux pas les saisir une par une. »

**Format CSV exemple :**
```csv
date;libelle
01/01/2026;Jour de l'an
01/05/2026;Fête du travail
```

**Implémentation :**

```
Frontend
  ImportHolidaysPage.jsx              → copier le modèle ImportEmployeesPage (16 lignes)
  FormulaireImportFichier             → réutiliser tel quel
  joursFeries.api.js                  → importHolidaysCsv()

Backend
  csvHolidayImport.js                 → réutiliser csvParser.js
  holidayService.js                   → createHoliday en boucle
  backoffice route + controller
```

**Effort estimé :** faible — même pattern que les imports employés/salaires.

---

### Exemple E — Jours fériés : bonus configurable (au lieu de ×1 fixe)

**Besoin métier :**  
« Un jour férié travaillé vaut **2×** le salaire/jour, pas seulement +1 jour. »

**État actuel :**  
Dans `calculateurSalaireMensuel.js`, un férié non payé ajoute exactement `salaryPerDay` au montant.

**Comportement proposé :**
- Champ `holiday_multiplier` (défaut 2) dans le formulaire mensuel
- Ou configuration globale en SQLite (table `parametres`)

**Implémentation :**

```
Frontend
  FormulaireSalaireMensuel.jsx        → input multiplicateur férié
  PageGenerationSalairesMensuels    → passer dans buildPayload

Backend
  calculateurSalaireMensuel.js      → remplacer +salaryPerDay par +salaryPerDay * (multiplier - 1)
  utilitairesSalaire.js             → parser le nouveau champ
```

**Effort estimé :** faible — une constante devient un paramètre.

---

### Exemple F — Salaire mensuel avec taux d'occupation (%)

**Besoin métier :**  
« L'employé n'est présent qu'à **80 %** du mois (temps partiel, entrée en cours de mois). »

**Comportement proposé :**
- Champ `occupation_rate` (50–100 %) par employé ou global pour la génération en masse
- Montant final = montant calculé × (taux / 100)
- Option avancée : taux par employé dans la sélection (colonne dans le tableau)

**Implémentation :**

```
Frontend
  SelectionEmployesMasse.jsx          → colonne optionnelle « Taux % »
  useGenerationSalairesMasse.js       → inclure les taux dans le payload

Backend
  serviceSalairesMensuelsMasse.js     → appliquer le taux après calculerMontantSalaireMensuel
```

**Effort estimé :** moyen — touche sélection + calcul, mais pattern masse déjà en place.

---

### Exemple G — Alertes « reste à payer » sur le dashboard

**Besoin métier :**  
« Voir en un coup d'œil combien de salaires ont encore un reste à payer et pour quel montant total. »

**Implémentation :**

```
Backend
  dashboardStats.js                   → requête SQL SUM(resteapayer) + COUNT

Frontend
  BackofficeDashboardPage.jsx         → 2–3 cartes summary (comme salaryCount existant)
```

**Effort estimé :** faible — extension du dashboard existant.

---

## 5. Quelle feature choisir en premier ?

| Priorité | Feature | Pourquoi |
|----------|---------|----------|
| 1 | **A — Paiement en % du reste** | Demande fréquente, peu de code, réutilise paiement masse |
| 2 | **C — Prévisualisation mensuelle** | Backend déjà prêt, évite les erreurs avant génération |
| 3 | **D — Import CSV jours fériés** | Pattern import déjà rodé, gain de temps utilisateur |
| 4 | **B — % du budget par poste** | Plus métier, mais logique proche du paiement masse actuel |
| 5 | **E — Multiplicateur férié** | Petite évolution du calculateur mensuel |

---

## 6. Checklist pour ajouter une feature (sans réécrire longtemps)

```
□ 1. Définir le besoin en 1 phrase + 1 règle de calcul
□ 2. Identifier la feature la plus proche (CRUD, import, masse, paiement)
□ 3. Copier le pattern existant (voir exemples ci-dessus)
□ 4. api/xxx.api.js          → 1 fonction
□ 5. hooks/useXxx.js         → si état complexe
□ 6. components/             → formulaire ou tableau
□ 7. pages/                  → assemblage (~40 lignes)
□ 8. backend service         → logique métier
□ 9. route + controller      → 2–5 lignes chacun
□ 10. App.jsx + Nav          → route + lien menu
```

---

## 7. Synthèse

| Domaine | Maturité actuelle | Extension naturelle |
|---------|-------------------|-------------------|
| Jours fériés | CRUD SQLite, impact calcul mensuel | Import CSV, multiplicateur, récurrence annuelle |
| Salaire mensuel | Calcul jours + fériés + week-end ×3 | Prévisualisation, taux occupation %, plafonds |
| Paiement salaire | Montants fixes, multi-lignes | **Paiement en %** du reste ou du budget |
| Paiement masse | Budget + priorité poste | **% budget par poste**, % du reste par salaire |
| Architecture | Hooks + composants + services | Nouvelles features = petits ajouts ciblés |

**Conclusion :** le code actuel est prêt pour ces évolutions. La fonctionnalité la plus parlante à implémenter en exemple concret est le **paiement en pourcentage** (Exemple A), car elle complète directement ce qui existe sans refonte.
