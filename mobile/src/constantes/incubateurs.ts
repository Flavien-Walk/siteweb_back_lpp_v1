/**
 * Liste des incubateurs et centres d'entrepreneuriat francais.
 * Triee par ordre alphabetique.
 * Source de verite partagee — dupliquee dans les frontends (mobile + web).
 */

export interface IncubateurInfo {
  nom: string;
  image: string; // URL Unsplash cadree 400x300
}

export const INCUBATEURS_FR: IncubateurInfo[] = [
  { nom: 'Agoranov', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop&q=80' },
  { nom: 'Belle de Mai', image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=400&h=300&fit=crop&q=80' },
  { nom: 'Bpifrance Le Hub', image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=300&fit=crop&q=80' },
  { nom: "Centre d'Entrepreneuriat Lyon Saint-Etienne", image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=300&fit=crop&q=80' },
  { nom: 'Creative Valley', image: 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=400&h=300&fit=crop&q=80' },
  { nom: 'Dauphine Incubateur', image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop&q=80' },
  { nom: 'ESSEC Ventures', image: 'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=400&h=300&fit=crop&q=80' },
  { nom: 'Euratechnologies', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop&q=80' },
  { nom: 'Founders Future', image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop&q=80' },
  { nom: 'HEC Incubateur', image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop&q=80' },
  { nom: 'IMT Starter', image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop&q=80' },
  { nom: 'IncubAlliance', image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=300&fit=crop&q=80' },
  { nom: 'Kanopee', image: 'https://images.unsplash.com/photo-1473830394358-91588751b241?w=400&h=300&fit=crop&q=80' },
  { nom: 'La French Tech', image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=300&fit=crop&q=80' },
  { nom: 'Le Village by CA', image: 'https://images.unsplash.com/photo-1577412647305-991150c7d163?w=400&h=300&fit=crop&q=80' },
  { nom: 'Le Wagon', image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=300&fit=crop&q=80' },
  { nom: 'NUMA', image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=300&fit=crop&q=80' },
  { nom: 'Paris Biotech Sante', image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=300&fit=crop&q=80' },
  { nom: 'Paris&Co', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop&q=80' },
  { nom: 'Plug and Play France', image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop&q=80' },
  { nom: 'Polytechnique X-UP', image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=300&fit=crop&q=80' },
  { nom: 'Schoolab', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=300&fit=crop&q=80' },
  { nom: 'Station F', image: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=400&h=300&fit=crop&q=80' },
  { nom: 'Techstars Paris', image: 'https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=400&h=300&fit=crop&q=80' },
  { nom: 'The Family', image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=300&fit=crop&q=80' },
  { nom: 'Wilco', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop&q=80' },
];

/** Liste des noms uniquement (pour validation) */
export const INCUBATEURS_NOMS: string[] = INCUBATEURS_FR.map(i => i.nom);
