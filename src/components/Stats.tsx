import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';

interface StatItemProps {
  value: string;
  label: string;
  highlight?: boolean;
  delay: number;
}

const AnimatedNumber = ({ value, inView }: { value: string; inView: boolean }) => {
  const [displayValue, setDisplayValue] = useState('0');
  const numericMatch = value.match(/^([+]?)(\d+(?:[.,]\d+)?)/);
  const prefix = numericMatch?.[1] || '';
  const numericPart = numericMatch?.[2] || '0';
  const suffix = value.replace(/^[+]?\d+(?:[.,]\d+)?/, '');

  useEffect(() => {
    if (!inView) return;

    const targetNum = parseFloat(numericPart.replace(',', '.'));
    const duration = 2000;
    const steps = 60;
    const increment = targetNum / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetNum) {
        setDisplayValue(numericPart);
        clearInterval(timer);
      } else {
        const formatted = numericPart.includes(',') || numericPart.includes('.')
          ? current.toFixed(1).replace('.', ',')
          : Math.floor(current).toString();
        setDisplayValue(formatted);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [inView, numericPart]);

  return (
    <>
      {prefix}{displayValue}{suffix}
    </>
  );
};

const StatItem = ({ value, label, highlight, delay }: StatItemProps) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.3,
  });

  return (
    <motion.div
      ref={ref}
      className="stat-item"
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      <div className={`stat-value ${highlight ? 'stat-value-highlight' : ''}`}>
        <AnimatedNumber value={value} inView={inView} />
      </div>
      <div className="stat-label">{label}</div>
    </motion.div>
  );
};

const Stats = () => {
  const stats = [
    { value: '+120', label: 'projets suivis', highlight: false },
    { value: '+3400', label: 'membres actifs', highlight: true },
    { value: '24', label: 'villes couvertes', highlight: false },
    { value: '4,8/5', label: 'note communauté', highlight: false },
  ];

  return (
    <section className="stats section">
      <div className="container">
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <StatItem
              key={stat.label}
              value={stat.value}
              label={stat.label}
              highlight={stat.highlight}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
