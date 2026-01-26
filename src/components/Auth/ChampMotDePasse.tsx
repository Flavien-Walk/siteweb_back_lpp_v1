import { useState, InputHTMLAttributes } from 'react';
import { HiEye, HiEyeOff } from 'react-icons/hi';

interface ChampMotDePasseProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  erreur?: string;
}

const ChampMotDePasse = ({ label, erreur, id, ...props }: ChampMotDePasseProps) => {
  const [visible, setVisible] = useState(false);

  const toggleVisibilite = () => {
    setVisible(!visible);
  };

  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      <div className="input-password-wrapper">
        <input
          type={visible ? 'text' : 'password'}
          id={id}
          className={`form-input ${erreur ? 'form-input-error' : ''}`}
          aria-invalid={!!erreur}
          aria-describedby={erreur ? `${id}-error` : undefined}
          {...props}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={toggleVisibilite}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {visible ? <HiEyeOff size={20} /> : <HiEye size={20} />}
        </button>
      </div>
      {erreur && (
        <p id={`${id}-error`} className="form-error" role="alert">
          {erreur}
        </p>
      )}
    </div>
  );
};

export default ChampMotDePasse;
