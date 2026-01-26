import '../styles/accueil.css';

import Header from '../components/Header';
import Hero from '../components/Hero';
import Stats from '../components/Stats';
import ProjetsALaUne from '../components/ProjetsALaUne';
import CommentCaMarche from '../components/CommentCaMarche';
import Communaute from '../components/Communaute';
import Securite from '../components/Securite';
import CtaFinal from '../components/CtaFinal';
import Marquee from '../components/Marquee';
import Footer from '../components/Footer';

const Accueil = () => {
  return (
    <div className="page-accueil">
      <Header />
      <main>
        <Hero />
        <Stats />
        <ProjetsALaUne />
        <CommentCaMarche />
        <Communaute />
        <Securite />
        <CtaFinal />
        <Marquee />
      </main>
      <Footer />
    </div>
  );
};

export default Accueil;
