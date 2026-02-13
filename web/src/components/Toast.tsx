import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { couleurs } from '../styles/theme';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={18} color="#22C55E" />,
    error: <XCircle size={18} color={couleurs.danger} />,
    warning: <AlertTriangle size={18} color={couleurs.accent} />,
    info: <Info size={18} color={couleurs.primaire} />,
  };

  const bgColors: Record<ToastType, string> = {
    success: 'rgba(34, 197, 94, 0.1)',
    error: `${couleurs.danger}15`,
    warning: `${couleurs.accent}15`,
    info: `${couleurs.primaire}15`,
  };

  const borderColors: Record<ToastType, string> = {
    success: 'rgba(34, 197, 94, 0.3)',
    error: `${couleurs.danger}40`,
    warning: `${couleurs.accent}40`,
    info: `${couleurs.primaire}40`,
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div style={s.container}>
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              style={{
                ...s.toast,
                backgroundColor: bgColors[t.type],
                borderColor: borderColors[t.type],
              }}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {icons[t.type]}
              <span style={s.message}>{t.message}</span>
              <button style={s.close} onClick={() => removeToast(t.id)}>
                <X size={14} color={couleurs.texteSecondaire} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 20,
    right: 20,
    zIndex: 3000,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxWidth: 380,
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  message: {
    flex: 1,
    fontSize: '0.875rem',
    color: couleurs.texte,
    fontWeight: '500',
  },
  close: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
    flexShrink: 0,
  },
};
