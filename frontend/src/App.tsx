import { Component, Suspense, lazy, useEffect, type ReactNode } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { ErrorState } from './components/ErrorState';
import { FeedbackWidget } from './components/FeedbackWidget';
import { Skeleton } from './components/Skeleton';
import { useWallet } from './hooks/useWallet';
import { reportError, track } from './lib/monitoring';
import { Explore } from './pages/Explore';

// Route-level code splitting: secondary pages ship as separate chunks and
// only load on navigation, keeping the initial bundle small.
const CampaignDetail = lazy(() =>
  import('./pages/CampaignDetail').then((m) => ({ default: m.CampaignDetail })),
);
const CreateCampaign = lazy(() =>
  import('./pages/CreateCampaign').then((m) => ({ default: m.CreateCampaign })),
);
const Leaderboard = lazy(() =>
  import('./pages/Leaderboard').then((m) => ({ default: m.Leaderboard })),
);

function PageFallback() {
  return (
    <div className="container">
      <Skeleton variant="card" height="16rem" />
    </div>
  );
}

/** Catches render errors anywhere below and shows a recoverable state. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Report render crashes to Sentry (no-op without VITE_SENTRY_DSN).
    void reportError(error, 'react-error-boundary');
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container">
          <ErrorState
            title="The app crashed"
            message={this.state.error.message}
            onRetry={() => this.setState({ error: null })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

function NotFound() {
  return (
    <div className="container">
      <ErrorState title="404" message="This page doesn't exist." />
    </div>
  );
}

/** Tracks one page view per route change (no-op without analytics config). */
function PageViewTracker() {
  const location = useLocation();
  useEffect(() => {
    void track('$pageview', { path: location.pathname });
  }, [location.pathname]);
  return null;
}

export default function App() {
  const wallet = useWallet();

  return (
    <ErrorBoundary>
      <HashRouter>
        <PageViewTracker />
        <Header wallet={wallet} />
        <main>
          <Routes>
            <Route path="/" element={<Explore />} />
            <Route
              path="/campaign/:id"
              element={
                <Suspense fallback={<PageFallback />}>
                  <CampaignDetail walletAddress={wallet.address} />
                </Suspense>
              }
            />
            <Route
              path="/create"
              element={
                <Suspense fallback={<PageFallback />}>
                  <CreateCampaign walletAddress={wallet.address} />
                </Suspense>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Leaderboard />
                </Suspense>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <FeedbackWidget walletAddress={wallet.address} />
        <footer className="footer">
          <div className="container">
            Built on <a href="https://stellar.org/soroban">Stellar Soroban</a> ·{' '}
            <a href="https://github.com/xeu03/crowdfundx">GitHub</a>
          </div>
        </footer>
      </HashRouter>
    </ErrorBoundary>
  );
}
