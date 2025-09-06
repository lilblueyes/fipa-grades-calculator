# FIPA Grades Calculator

Application web destinée aux étudiants de la Formation d’Ingénieur par Alternance (FIPA) de l’ENSTA campus de Brest, permettant de calculer rapidement leurs moyennes semestrielles, fonctionnalité non prise en charge par le logiciel officiel de l'école.

<img width="1920" height="845" alt="mockup" src="https://github.com/user-attachments/assets/9b7e7ab6-ed62-49c6-a0d4-a08a07842ae2" />

## Fonctionnalités

* **Support des différentes spécialités proposées en FIPA :**
  * Systèmes Embarqués (SE)
  * Mécanique (MECA 1A)
  * Architecture Navale & Offshore (ANO)
  * Architecture de Véhicules (AV)

* **Prise en charge des promotions actuelles :**
  * Gestion des promotions FIPA27 et FIPA28.

* **Calcul instantané des moyennes pondérées** :

  * Affichage des résultats détaillés pour chaque Unité d’Enseignement (UE).
  * Indication immédiate si la moyenne cible est atteinte ou non.
  * Calcul automatique des notes minimales nécessaires pour atteindre la moyenne cible.
  * Moyenne cible modifiable pour simuler différents scénarios.

* **Interface utilisateur moderne** :

  * Design adaptatif (responsive) compatible sur mobile, tablette et desktop.
  * Mode sombre et clair.

* **Prise en compte des étudiants en Formation Continue** :

  * Option à cocher spécifiquement pour afficher les cours dédiés à la formation continue.
 
* **Sauvegarde automatique des notes** :

  * Utilisation du stockage local (`localStorage`) dans le navigateur pour conserver les notes saisies par l'utilisateur entre les sessions.

## Structure des données

Les données sont organisées par promotion, sous forme de fichiers JSON distincts pour chaque semestre. Chaque fichier `sX.json` contient les cours, coefficients et détails spécifiques aux spécialités concernées.

```
data/
├── 27/
│   ├── s1.json
│   ├── sX.json
│   └── s6.json
└── 28/
    ├── s1.json
    ├── sX.json
    └── s6.json
```

## Utilisation

* Rendez-vous directement à l’URL : [fipa-grades-calculator](https://lilblueyes.github.io/fipa-grades-calculator/)
* Sélectionnez le semestre depuis le menu latéral.
* Renseignez votre promotion dans la liste déroulante.
* Choisissez votre spécialité dans la liste déroulante.
* Cochez la case « Formation Continue » si vous êtes concerné.
* Saisissez vos notes dans les champs dédiés.
* Cliquez sur le bouton « Calculer » pour afficher les résultats.

## Contribution

Les contributions sont les bienvenues. Veuillez ouvrir une issue pour signaler des bugs ou suggérer des améliorations. N'hésitez pas à proposer des Pull Requests.

## Licence

Ce projet est sous licence MIT. Consultez le fichier [LICENSE](LICENSE) pour plus de détails.

## Contact

jocelyn.deleuil@ensta.fr (FIPA27 SE)
