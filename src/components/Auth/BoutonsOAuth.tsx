import { FcGoogle } from 'react-icons/fc';
import { FaFacebook, FaApple } from 'react-icons/fa';
import { urlOAuth } from '../../services/auth';

const BoutonsOAuth = () => {
  const handleOAuth = (url: string) => {
    window.location.href = url;
  };

  return (
    <div className="oauth-section">
      <div className="oauth-divider">
        <span>ou continuer avec</span>
      </div>

      <div className="oauth-buttons">
        <button
          type="button"
          className="oauth-btn oauth-btn-google"
          onClick={() => handleOAuth(urlOAuth.google)}
          aria-label="Continuer avec Google"
        >
          <FcGoogle size={20} />
          <span>Google</span>
        </button>

        <button
          type="button"
          className="oauth-btn oauth-btn-facebook"
          onClick={() => handleOAuth(urlOAuth.facebook)}
          aria-label="Continuer avec Facebook"
        >
          <FaFacebook size={20} />
          <span>Facebook</span>
        </button>

        <button
          type="button"
          className="oauth-btn oauth-btn-apple"
          onClick={() => handleOAuth(urlOAuth.apple)}
          aria-label="Continuer avec Apple"
        >
          <FaApple size={20} />
          <span>Apple</span>
        </button>
      </div>
    </div>
  );
};

export default BoutonsOAuth;
