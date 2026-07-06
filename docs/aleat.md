Creation nouvelle page dans FrontOffice:
    *Reprendre Generer salaire en masse 
        -Modification a appliquer :
            **au lieu de date , on choisis mois et annee
            **nouveau champ de saisi pour salaire par jour 
            **bouton generer

    *Regle metier a prendre en compte:
        -si pour mois de juin exemple , un payment deja effectuer lors
        periode du 12 Juin au 20 Juin 
        -> Il ne sera plus pris en compte au payement du mois , il ne sera pas payer 2 fois (logique)
        -si jour ferie le payement sera double

Scenario:
    Avoir choisi Mois:Juin (30Jours)
    Salaire par jour: 10
    Bouton generer
Donc total salaire du mois : 30*10 = 300
    Si jour ferie existe dans ce mois :
    salaire du jour * 2

    Payer partiellement le mois de Juin 
    exemple:
    -> periode du 12 au 20 juin (paye)
    -> total reste payement du mois ne doit plus prendre en compte ce payement

    Periode efa paye