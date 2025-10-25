import { Link, useLocation } from 'react-router-dom';

export function BottomNav() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Rhythm List */}
        <Link
          to="/rhythms"
          className={`nav-item flex-1 ${isActive('/rhythms') ? 'nav-item-active' : ''}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-xs mt-1">Rhythms</span>
        </Link>

        {/* New Recording (Home) */}
        <Link
          to="/"
          className={`nav-item flex-1 ${isActive('/') ? 'nav-item-active' : ''}`}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center -mt-6 shadow-lg ${
            isActive('/') ? 'bg-blue-500' : 'bg-gray-700'
          }`}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-xs mt-1">Record</span>
        </Link>

        {/* Stats (placeholder) */}
        <Link
          to="/stats"
          className={`nav-item flex-1 ${isActive('/stats') ? 'nav-item-active' : ''}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-xs mt-1">Stats</span>
        </Link>
      </div>
    </nav>
  );
}
