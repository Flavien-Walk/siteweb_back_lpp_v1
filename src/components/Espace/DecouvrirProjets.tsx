import { useState, useEffect } from 'react';
import { HiSearch, HiViewGrid, HiMap } from 'react-icons/hi';
import CarteProjet from './CarteProjet';
import CarteInteractive from './CarteInteractive';
import { getProjets, suivreProjet, type Projet } from '../../services/projets';
import { MOCK_PROJETS } from '../../data/mockData';
import { useAuth } from '../../contexts/AuthContext';

const CATEGORIES = [
  { value: '', label: 'Toutes' },
  { value: 'tech', label: 'Tech' },
  { value: 'food', label: 'Food' },
  { value: 'sante', label: 'Santé' },
  { value: 'education', label: 'Éducation' },
  { value: 'energie', label: 'Énergie' },
  { value: 'culture', label: 'Culture' },
  { value: 'environnement', label: 'Environnement' },
];

const MATURITES = [
  { value: '', label: 'Toutes' },
  { value: 'idee', label: 'Idée' },
  { value: 'prototype', label: 'Prototype' },
  { value: 'lancement', label: 'Lancement' },
  { value: 'croissance', label: 'Croissance' },
];

const DecouvrirProjets = () => {
  const { utilisateur } = useAuth();
  const [projets, setProjets] = useState<Projet[]>([]);
  const [recherche, setRecherche] = useState('');
  const [categorie, setCategorie] = useState('');
  const [maturite, setMaturite] = useState('');
  const [vueCarte, setVueCarte] = useState(false);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    chargerProjets();
  }, [categorie, maturite]);

  const chargerProjets = async () => {
    setChargement(true);
    const params: Record<string, string> = {};
    if (categorie) params.categorie = categorie;
    if (maturite) params.maturite = maturite;
    if (recherche) params.q = recherche;

    const res = await getProjets(params);
    if (res.succes && res.data && res.data.projets.length > 0) {
      setProjets(res.data.projets);
    } else {
      // Fallback mock data
      let mock = [...MOCK_PROJETS];
      if (categorie) mock = mock.filter((p) => p.categorie === categorie);
      if (maturite) mock = mock.filter((p) => p.maturite === maturite);
      if (recherche) {
        const q = recherche.toLowerCase();
        mock = mock.filter(
          (p) => p.nom.toLowerCase().includes(q) || p.pitch.toLowerCase().includes(q)
        );
      }
      setProjets(mock);
    }
    setChargement(false);
  };

  const handleRecherche = (e: React.FormEvent) => {
    e.preventDefault();
    chargerProjets();
  };

  const handleToggleSuivi = async (id: string) => {
    const res = await suivreProjet(id);
    if (res.succes && res.data) {
      setProjets((prev) =>
        prev.map((p) => {
          if (p._id !== id) return p;
          const userId = utilisateur?.id || '';
          const followers = res.data!.suivi
            ? [...p.followers, userId]
            : p.followers.filter((f) => f !== userId);
          return { ...p, followers };
        })
      );
    } else {
      // Toggle local
      setProjets((prev) =>
        prev.map((p) => {
          if (p._id !== id) return p;
          const uid = utilisateur?.id || 'local';
          const suivi = p.followers.includes(uid);
          return { ...p, followers: suivi ? p.followers.filter((f) => f !== uid) : [...p.followers, uid] };
        })
      );
    }
  };

  const estSuivi = (projet: Projet) => {
    const uid = utilisateur?.id || 'local';
    return projet.followers.includes(uid);
  };

  return (
    <div className="decouvrir">
      <div className="decouvrir-header">
        <h2 className="espace-titre">Découvrir les projets</h2>
        <div className="decouvrir-vue-toggle">
          <button
            className={`vue-btn ${!vueCarte ? 'vue-btn-actif' : ''}`}
            onClick={() => setVueCarte(false)}
            aria-label="Vue grille"
          >
            <HiViewGrid size={18} />
          </button>
          <button
            className={`vue-btn ${vueCarte ? 'vue-btn-actif' : ''}`}
            onClick={() => setVueCarte(true)}
            aria-label="Vue carte"
          >
            <HiMap size={18} />
          </button>
        </div>
      </div>

      <form className="decouvrir-filtres" onSubmit={handleRecherche}>
        <div className="decouvrir-recherche">
          <HiSearch className="decouvrir-recherche-icon" />
          <input
            type="text"
            placeholder="Rechercher un projet..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="decouvrir-recherche-input"
          />
        </div>
        <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="decouvrir-select">
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={maturite} onChange={(e) => setMaturite(e.target.value)} className="decouvrir-select">
          {MATURITES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </form>

      {chargement ? (
        <div className="espace-loading">Chargement des projets...</div>
      ) : vueCarte ? (
        <CarteInteractive projets={projets} />
      ) : (
        <div className="decouvrir-grille">
          {projets.length === 0 ? (
            <div className="espace-vide">Aucun projet trouvé.</div>
          ) : (
            projets.map((projet) => (
              <CarteProjet
                key={projet._id}
                projet={projet}
                estSuivi={estSuivi(projet)}
                onToggleSuivi={handleToggleSuivi}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DecouvrirProjets;
