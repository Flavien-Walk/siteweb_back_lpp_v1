/**
 * Liste des incubateurs et centres d'entrepreneuriat francais.
 * Triee par ordre alphabetique.
 * Source de verite partagee — dupliquee dans les frontends (mobile + web).
 */

export interface IncubateurInfo {
  nom: string;
  image: string; // URL image/logo — vide = gradient fallback
}

export const INCUBATEURS_FR: IncubateurInfo[] = [
  { nom: 'Agoranov', image: 'https://cdn.prod.website-files.com/5d1395ae389a340b0cc7a0d6/5d1395ae389a346b5ec7a1c5_Agoranov_Logo_Miniature_CMJN_BLANC.png' },
  { nom: 'Belle de Mai', image: 'https://belledemai.org/wp-content/uploads/2023/06/cropped-logo-bdm-512.png' },
  { nom: 'Bpifrance Le Hub', image: 'https://lehub.bpifrance.fr/wp-content/uploads/2023/01/lehub-logo.png' },
  { nom: 'CELSE Lyon Saint-Etienne', image: 'https://centre-entrepreneuriat.universite-lyon.fr/uas/CENTREENT/LOGO/centre_entrepreneuriat_lse_quadri.png' },
  { nom: 'Creative Valley', image: 'https://www.creativevalley.fr/wp-content/uploads/2021/06/logo-creative-valley.png' },
  { nom: 'Dauphine Incubateur', image: 'https://dauphine.psl.eu/themes/custom/flavor/images/logo-dauphine.svg' },
  { nom: 'ESSEC Ventures', image: 'https://www.essec.edu/media/essec-logo-share.jpg' },
  { nom: 'Euratechnologies', image: 'https://bo.euratechnologies.com/assets/e74594b3-ad38-4f6d-abd4-7d070f291e51' },
  { nom: 'Founders Future', image: 'https://cdn.prod.website-files.com/675b0f49e8a9aae0e5259468/6762e6fe970b3fb488872db1_illu.avif' },
  { nom: 'HEC Incubateur', image: 'https://hec-prod-drupalfiles.oos.cloudgouv-eu-west-1.outscale.com/s3fs-public/inline-images/Logo%20Incubateur%20HEC%20Paris%20Blue.png' },
  { nom: 'IMT Starter', image: 'https://www.imt.fr/wp-content/themes/starter-developer/assets/images/imt-logo.svg' },
  { nom: 'IncubAlliance', image: 'https://www.incuballiance.fr/wp-content/themes/ikadia-theme-child/assets/images/logo.svg' },
  { nom: 'Kanopee', image: '' },
  { nom: 'La French Tech', image: 'https://lafrenchtech.com/wp-content/uploads/2020/11/LFT-share.png' },
  { nom: 'Le Village by CA', image: 'https://levillagebyca.com/app/uploads/2023/06/Design-sans-titre-8-1024x726.png' },
  { nom: 'Le Wagon', image: 'https://www.lewagon.com/assets/logo_lewagon-b1014bba2adfc0c30ddef2b93b24d4f73a5fd83e032f0755c4b3ecaabe9e3a04.png' },
  { nom: 'NUMA', image: 'https://numa.co/images/logo-numa.svg' },
  { nom: 'Paris Biotech Sante', image: '' },
  { nom: 'Paris&Co', image: 'https://www.parisandco.paris/content/uploads/2023/02/logo-paris-co.svg' },
  { nom: 'Plug and Play France', image: 'https://www.plugandplaytechcenter.com/images/logo-pnp.svg' },
  { nom: 'Polytechnique X-UP', image: 'https://programmes.polytechnique.edu/sites/default/files/logo_polytechnique.png' },
  { nom: 'Schoolab', image: 'https://www.theschoolab.com/wp-content/themes/developer-developer/assets/images/logo-schoolab.svg' },
  { nom: 'Station F', image: 'https://s3.eu-west-3.amazonaws.com/stationf.co.prod/newsroom/covers/77bf0558-bf1a-423e-bd08-c7f9b2fdd92e.png' },
  { nom: 'Techstars Paris', image: 'https://brand.techstars.com/img/logo/techstars-logo-primary.svg' },
  { nom: 'The Family', image: '' },
  { nom: 'Wilco', image: '' },
];

/** Liste des noms uniquement (pour validation) */
export const INCUBATEURS_NOMS: string[] = INCUBATEURS_FR.map(i => i.nom);
