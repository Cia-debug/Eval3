import { Outlet } from 'react-router-dom';
import BackofficeNav from './BackofficeNav';

export default function BackofficeLayout() {
  return (
    <div className="app-shell">
      <BackofficeNav />
      <div className="app-main">
        <Outlet />
      </div>
    </div>
  );
}
