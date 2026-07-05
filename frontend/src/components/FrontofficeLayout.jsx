import { Outlet } from 'react-router-dom';
import FrontofficeNav from './FrontofficeNav';

export default function FrontofficeLayout() {
  return (
    <div className="app-shell">
      <FrontofficeNav />
      <div className="app-main">
        <Outlet />
      </div>
    </div>
  );
}
