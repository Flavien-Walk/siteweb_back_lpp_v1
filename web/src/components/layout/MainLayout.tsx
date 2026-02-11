import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { couleurs } from '../../styles/theme';

export default function MainLayout() {
  return (
    <div style={styles.container}>
      <Sidebar />
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: couleurs.fond,
  },
  main: {
    marginLeft: 260,
    flex: 1,
    minHeight: '100vh',
    padding: '32px 40px',
    maxWidth: 1200,
  },
};