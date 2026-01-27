import { useState, useEffect } from 'react';
import { HiFolder } from 'react-icons/hi';
import CarteProjet from './CarteProjet';
import { getMesProjets, suivreProjet, type Projet } from '../../services/projets';
import { useAuth } from '../../contexts/AuthContext';

const MesProjets = () => {
  const { utilisateur } = useAuth();
  const [projets, setProjets] = useState<Projet[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    charger();
  }, []);

  const charger = async () => {
    setChargement(true);
    const res = await getMesProjets();
    if (res.succes && res.data) {
      setProjets(res.data.projets);
    }
    setChargement(false);
  };

  const handleToggleSuivi = async (id: string) => {
    const res = await suivreProjet(id);
    if (res.succes) {
      // Retirer le projet de la liste si on ne le suit plus
      if (!res.data?.suivi) {
        setProjets((prev) => prev.filter((p) => p._id !== id));
      }
    }
  };

  if (chargement) {
    return <div className="espace-loading">Chargement de tes projets...</div>;
  }

  return (
    <div className="mes-projets">
      <h2 className="espace-titre">Mes projets suivis</h2>

      {projets.length === 0 ? (
        <div className="espace-vide-container">
          <HiFolder className="espace-vide-icon" />
          <h3>Aucun projet suivi</h3>
          <p>Découvre des projets et clique sur "Suivre" pour les retrouver ici.</p>
        </div>
      ) : (
        <div className="decouvrir-grille">
          {projets.map((projet) => (
            <CarteProjet
              key={projet._id}
              projet={projet}
              estSuivi={true}
              onToggleSuivi={handleToggleSuivi}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MesProjets;
