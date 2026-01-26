import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

// Import avatars
import avatar1 from '../assets/avatars/avatar-1.svg';
import avatar2 from '../assets/avatars/avatar-2.svg';
import avatar3 from '../assets/avatars/avatar-3.svg';
import avatar4 from '../assets/avatars/avatar-4.svg';
import avatar5 from '../assets/avatars/avatar-5.svg';

interface Testimonial {
  id: number;
  pseudo: string;
  age: number;
  message: string;
  type: 'explorateur' | 'entrepreneur';
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    pseudo: 'Inès',
    age: 21,
    message: 'J\'ai découvert 3 projets incroyables dans ma ville que je ne connaissais pas. C\'est motivant de voir des jeunes qui se lancent !',
    type: 'explorateur',
    avatar: avatar1,
  },
  {
    id: 2,
    pseudo: 'Théo',
    age: 24,
    message: 'Grâce à La Première Pierre, j\'ai trouvé mes premiers soutiens en moins d\'un mois. La communauté est vraiment bienveillante.',
    type: 'entrepreneur',
    avatar: avatar2,
  },
  {
    id: 3,
    pseudo: 'Léa',
    age: 19,
    message: 'Interface claire, projets vérifiés, et je peux suivre l\'évolution en temps réel. Exactement ce qu\'il me fallait.',
    type: 'explorateur',
    avatar: avatar3,
  },
  {
    id: 4,
    pseudo: 'Karim',
    age: 23,
    message: 'Le process de validation est sérieux mais accessible. Ça rassure les soutiens et ça crédibilise mon projet.',
    type: 'entrepreneur',
    avatar: avatar4,
  },
  {
    id: 5,
    pseudo: 'Emma',
    age: 20,
    message: 'Enfin une plateforme qui parle à ma génération. Simple, transparente, et les projets ont du sens.',
    type: 'explorateur',
    avatar: avatar5,
  },
];

const TestimonialCard = ({ testimonial, index }: { testimonial: Testimonial; index: number }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  return (
    <motion.article
      ref={ref}
      className="testimonial-card"
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div className="testimonial-header">
        <img
          src={testimonial.avatar}
          alt={`Photo de ${testimonial.pseudo}`}
          className="testimonial-avatar-img"
        />
        <div className="testimonial-info">
          <div className="testimonial-name">
            {testimonial.pseudo}, {testimonial.age} ans
          </div>
          <div className="testimonial-meta">Membre La Première Pierre</div>
        </div>
        <span className={`testimonial-badge ${testimonial.type}`}>
          {testimonial.type === 'explorateur' ? 'Explorateur' : 'Entrepreneur'}
        </span>
      </div>
      <p className="testimonial-content">{testimonial.message}</p>
    </motion.article>
  );
};

const Communaute = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="communaute section" id="communaute">
      <div className="container">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className="section-title">Ce que dit la communauté</h2>
          <p className="section-subtitle">
            Des retours authentiques de membres qui utilisent La Première Pierre au quotidien.
          </p>
        </motion.div>

        <div className="testimonials-container">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={testimonial.id}
              testimonial={testimonial}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Communaute;
