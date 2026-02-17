# Mapping Donnees Dashboard BK

## Objectif
Ce document explique, pour chaque indicateur du dashboard BK:
- la source CSV d'origine,
- ce qui est calcule cote backend,
- ce qui est recalcule cote frontend.

Il peut etre partage tel quel avec un client.

## Flux de donnees (vue simple)
1. Les 8 fichiers CSV sont importes via l'ecran d'import.
2. Le backend lit les CSV, stocke les lignes, puis calcule des indicateurs journaliers.
3. Le dashboard recupere ces donnees journalieres.
4. Le frontend agregre selon le filtre actif (annee, mois, semaine, jour).

## KPI affiches dans le dashboard

### 1) Chiffre d'affaires (CA)
- Source principale: `SyntheseCA_caparprofit.csv` (colonne `net`).
- Backend: calcule `ca_real` comme somme des `net` (avec fallback si besoin).
- Frontend: somme les jours de la periode filtree.

### 2) CA N-1
- Source: donnee N-1 (meme date l'annee precedente).
- Backend: fallback automatique vers la valeur de l'an dernier si non saisie manuellement.
- Frontend: somme sur la periode filtree.

### 3) Nombre de ventes
- Source principale: `SyntheseCA_caparprofit.csv` (colonne `tac`).
- Backend: calcule `clients` par somme de `tac`.
- Frontend: somme sur la periode filtree.

### 4) Nombre de ventes N-1
- Source: donnee N-1 sur la meme logique que ci-dessus.
- Backend: fallback automatique.
- Frontend: somme sur la periode filtree.

### 5) Panier moyen
- Source: derive du CA et du nombre de ventes.
- Backend: pas d'indicateur final affiche tel quel pour le dashboard.
- Frontend: calcule `panier moyen = CA / ventes` apres aggregation.

### 6) Panier moyen N-1
- Source: derive du CA N-1 et des ventes N-1.
- Frontend: calcule `panier moyen N-1 = CA N-1 / ventes N-1`.

### 7) CA Delivery
- Source: `SyntheseCA_caparprofit.csv` (colonne `net`, lignes canal `HOME DELIVERY`).
- Backend: somme des lignes delivery.
- Frontend: somme sur la periode filtree.

### 8) CA Delivery N-1
- Source: donnee N-1 sur le meme principe.
- Backend: fallback automatique.
- Frontend: somme sur la periode filtree.

### 9) CA Click & Collect
- Source: `SyntheseCA_caparprofit.csv` (colonne `net`, lignes canal `CLICK & COLLECT`).
- Backend: somme des lignes Click & Collect.
- Frontend: somme sur la periode filtree.

### 10) CA Click & Collect N-1
- Source: donnee N-1 sur le meme principe.
- Backend: fallback automatique.
- Frontend: somme sur la periode filtree.

### 11) CA Magasin
- Source: donnee derivee (pas une colonne CSV directe).
- Frontend: calcule `CA Magasin = CA Total - CA Delivery - CA Click & Collect`.

### 12) CA Magasin N-1
- Source: donnee derivee.
- Frontend: calcule `CA Magasin N-1 = CA N-1 - CA Delivery N-1 - CA Click & Collect N-1`.

### 13) Marge
- Source principale: `SyntheseCA_caparprofit.csv` (colonne `netTotalProfit`).
- Backend: calcule `marge` par somme des `netTotalProfit`.
- Frontend: somme sur la periode filtree.

### 14) Marge N-1
- Source: donnee N-1 sur le meme principe.
- Backend: calcule depuis les donnees de l'annee precedente.
- Frontend: somme sur la periode filtree.

### 15) Taux de pertes
- Source principale: `SyntheseCA_divers.csv` (colonne `montantAnnulations`).
- Backend: calcule `taux_pertes = pertes_montant / ca_real`.
- Frontend: re-calcule au niveau periode via les totaux agreges.

### 16) Taux de pertes N-1
- Source: donnee N-1 sur le meme principe.
- Backend: calcule sur les valeurs N-1.
- Frontend: re-calcule au niveau periode agregee.

### 17) Commentaires affiches dans les tooltips
- Source: commentaire saisi lors de l'import du jour.
- Backend: renvoie `comment` (N) et `comment_n1` (N-1).
- Frontend:
  - affiche `Com. N` et `Com. N-1` seulement si present,
  - tronque si trop long,
  - affiche le texte complet au survol.

### 18) Heures personnel
- Source: saisie manuelle dans l'etape de confirmation d'import.
- Backend: stocke dans `bk_daily_kpis.heures_personnel`.
- Frontend: somme sur la periode filtree.

### 19) Heures personnel N-1
- Source: donnee N-1 (meme date annee precedente).
- Backend: fallback automatique.
- Frontend: somme sur la periode filtree.

### 20) Heures formation (cout complementaire)
- Source: saisie manuelle dans l'etape de confirmation d'import (champ technique `heures_travail`).
- Backend: stocke dans `bk_daily_kpis.heures_travail`.
- Frontend: somme sur la periode filtree.

### 21) Taux horaire
- Source: saisie manuelle dans l'etape de confirmation d'import (pre-rempli a `18,60` et modifiable).
- Backend: stocke dans `bk_daily_kpis.taux_horaire`.
- Frontend: calcule une moyenne ponderee (poids principal: heures de formation/cout complementaire).

### 22) Cout RH
- Source: donnee derivee (pas une colonne CSV directe).
- Frontend: calcule `Cout RH = (Heures personnel x Taux horaire) + Heures formation (cout complementaire)`.
- N-1: meme formule sur les donnees N-1.

### 23) % Perso reel
- Source: donnee derivee.
- Frontend: calcule `% Perso reel = Cout RH / CA`.
- N-1: calcule `% Perso reel N-1 = Cout RH N-1 / CA N-1`.
- Note: cette formule suit la logique du fichier client (`((heures prestees * taux horaire) + cout complementaire) / CA`).

### 24) OSAT
- Source: saisie manuelle dans l'etape de confirmation d'import.
- Backend: stocke dans `bk_daily_kpis.osat_score`.
- Frontend: moyenne sur la periode, puis affichage en `%`.

### 25) GXI
- Source: saisie manuelle dans l'etape de confirmation d'import.
- Backend: stocke dans `bk_daily_kpis.gxi_score`.
- Frontend: moyenne sur la periode.
- Note metier: echelle a confirmer (pas de standard unique dans le projet).

### 26) Google (/5)
- Source: saisie manuelle dans l'etape de confirmation d'import.
- Backend: stocke dans `bk_daily_kpis.google_score`.
- Frontend: moyenne sur la periode et affichage normalise `x /5`.

## Fichiers CSV importes et usage
- `SyntheseCA_caparprofit.csv`  
  Usage principal dashboard (CA, ventes, delivery, click & collect, marge).

- `SyntheseCA_divers.csv`  
  Usage dashboard pour les pertes (`montantAnnulations`) et le taux de pertes.

- `SyntheseCA_consommationparprofit.csv`  
  Stocke en base, non affiche dans les KPI principaux du dashboard actuel.

- `SyntheseCA_corrections.csv`  
  Stocke en base, non affiche dans les KPI principaux du dashboard actuel.

- `SyntheseCA_reglement.csv`  
  Stocke en base, non affiche dans les KPI principaux du dashboard actuel.

- `SyntheseCA_remises.csv`  
  Stocke en base, non affiche dans les KPI principaux du dashboard actuel.

- `SyntheseCA_tva.csv`  
  Stocke en base, non affiche dans les KPI principaux du dashboard actuel.

- `SyntheseCA_venteAnnexes.csv`  
  Stocke en base, non affiche dans les KPI principaux du dashboard actuel.

## Donnees hors CSV (saisies manuellement a l'import)
- `heures_personnel`
- `heures_travail` (affiche en UI comme "Heures formation (cout complementaire)")
- `taux_horaire`
- `osat_score`
- `gxi_score`
- `google_score`

## Regle de variation affichee (fleche verte/rouge)
Les variations sont affichees en pourcentage relatif:

`variation = (valeur_N - valeur_N_1) / valeur_N_1`

Ce n'est pas un ecart en points.

---
Document genere pour support client / partage Drive.
