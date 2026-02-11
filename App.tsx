'use client';
import React, { useState, useEffect } from 'react';
import { User, UserRole, UserPlan } from './types';
import Login from './components/Login';
import SignUp from './components/SignUp';
import ClienteApp from './components/ClienteApp';
import BarberDashboard from './components/BarberDashboard';
import AdminDashboard from './components/AdminDashboard';
import SettingsView from './components/SettingsView';
import FinancialView from './components/FinancialView';
import BarberFinancialView from './components/BarberFinancialView';
import BarberAgendaView from './components/BarberAgendaView';
import MarketplaceView from './components/MarketplaceView';
import { logout, checkSession } from './actions/auth/auth.actions';
import {
  LogOut,
  Calendar,
  Settings,
  DollarSign,
  ShoppingBag,
  LayoutDashboard,
} from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<string>('main');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [startWithPlanModal, setStartWithPlanModal] = useState(false);

  useEffect(() => {
    const initUser = async () => {
      setLoading(true);
      try {
        // 1. Check server session first (single source of truth for auth)
        const sessionResult = await checkSession();

        if (sessionResult.isAuth && sessionResult.user) {
          console.log('Session verified on server:', sessionResult.user);
          setUser(sessionResult.user);
          localStorage.setItem(
            'stayler_user',
            JSON.stringify(sessionResult.user),
          );
          setLoading(false);
          return;
        }

        // 2. If no server session, check local storage as fallback/hint
        const savedUser = localStorage.getItem('stayler_user');
        if (savedUser) {
          // If we have local user but no server session, the session expired.
          console.warn(
            'Local user found but no active server session. Clearing...',
          );
          localStorage.removeItem('stayler_user');
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
      } finally {
        setLoading(false);
      }
    };
    initUser();
  }, []);

  // Poll for verifying subscription update
  useEffect(() => {
    /* 
    if (typeof window !== 'undefined' && user?.id) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('subscription_success') === 'true') {
        // Simple polling mechanism
        const pollInterval = setInterval(async () => {
          try {
            const params = new URLSearchParams(window.location.search);
            const sessionId = params.get('session_id');

            // Active Verification: Force DB update if session is paid
            if (sessionId) {
              const { checkCheckoutSession } = await import(
                './actions/stripe.actions'
              );
              await checkCheckoutSession(sessionId);
            }

            // Poll for result
            const { getUser } = await import('./actions/user.actions');
            const updatedUser = await getUser(user.id);

            if (updatedUser && updatedUser.plan === 'PREMIUM') {
              clearInterval(pollInterval);

              // Clear URL params
              window.history.replaceState({}, '', window.location.pathname);

              // Update local state immediately
              const newUserState = {
                ...user,
                ...updatedUser,
                plan: 'PREMIUM' as UserPlan, // Force type check
                role: updatedUser.role as UserRole,
              };

              handleUpdateUser(newUserState);
            }
          } catch (err) {
            console.error('Error polling user plan:', err);
          }
        }, 2000);

        // Stop after 60 seconds
        setTimeout(() => clearInterval(pollInterval), 60000);

        return () => clearInterval(pollInterval);
      }
    }
    */
  }, [user]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('stayler_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    setCurrentView('main');
    localStorage.removeItem('stayler_user');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('stayler_user', JSON.stringify(updatedUser));
  };

  const handleRegister = (user: User) => {
    setUser(user);
    localStorage.setItem('stayler_user', JSON.stringify(user));
    setIsSigningUp(false);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-amber-500"></div>
      </div>
    );

  if (!user) {
    if (isSigningUp) {
      return (
        <SignUp
          onRegister={handleRegister}
          onBackToLogin={() => setIsSigningUp(false)}
        />
      );
    }
    return (
      <Login onLogin={handleLogin} onSignUpClick={() => setIsSigningUp(true)} />
    );
  }

  const isAdmin = user.role === UserRole.ADMIN;
  const isBarber = user.role === UserRole.BARBEIRO;
  const isStaff = isAdmin || isBarber;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col md:flex-row">
      <nav className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-xl border-t border-neutral-800/50 md:relative md:w-64 md:border-t-0 md:border-r z-50">
        <div className="flex md:flex-col items-center justify-center md:justify-start h-20 md:h-full py-2 md:py-8 gap-1 md:gap-4 px-2 md:px-0">
          <div className="hidden md:block mb-8 text-center px-4">
            <h1 className="text-2xl font-display font-bold tracking-tighter text-amber-500">
              STAYLER
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">
              Barbearia Premium
            </p>
          </div>

          <div className="flex flex-row md:flex-col items-center justify-center md:justify-start gap-1 w-full max-w-sm md:max-w-none md:px-3">
            <button
              className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 p-2 rounded-xl flex-1 md:w-full md:px-4 transition-all ${
                currentView === 'main'
                  ? 'text-amber-500 bg-amber-500/5 md:bg-amber-500/10'
                  : 'text-neutral-500 hover:text-white'
              }`}
              onClick={() => {
                setCurrentView('main');
                setStartWithPlanModal(false);
              }}
            >
              {isStaff ? <LayoutDashboard size={22} /> : <Calendar size={22} />}
              <span className="text-[9px] md:text-sm font-bold md:font-medium uppercase md:capitalize tracking-wider md:tracking-normal">
                {isStaff ? 'Dashboard' : 'Agenda'}
              </span>
            </button>

            {isStaff && (
              <button
                className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 p-2 rounded-xl flex-1 md:w-full md:px-4 transition-all ${
                  currentView === 'agenda'
                    ? 'text-amber-500 bg-amber-500/5 md:bg-amber-500/10'
                    : 'text-neutral-500 hover:text-white'
                }`}
                onClick={() => {
                  setCurrentView('agenda');
                  setStartWithPlanModal(false);
                }}
              >
                <Calendar size={22} />
                <span className="text-[9px] md:text-sm font-bold md:font-medium uppercase md:capitalize tracking-wider md:tracking-normal">
                  Agenda
                </span>
              </button>
            )}

            {(user.role === UserRole.CLIENTE || isAdmin) && (
              <button
                className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 p-2 rounded-xl flex-1 md:w-full md:px-4 transition-all ${
                  currentView === 'marketplace'
                    ? 'text-amber-500 bg-amber-500/5 md:bg-amber-500/10'
                    : 'text-neutral-500 hover:text-white'
                }`}
                onClick={() => {
                  setCurrentView('marketplace');
                  setStartWithPlanModal(false);
                }}
              >
                <ShoppingBag size={22} />
                <span className="text-[9px] md:text-sm font-bold md:font-medium uppercase md:capitalize tracking-wider md:tracking-normal">
                  Market
                </span>
              </button>
            )}

            <button
              className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 p-2 rounded-xl flex-1 md:w-full md:px-4 transition-all ${
                currentView === 'financial'
                  ? 'text-amber-500 bg-amber-500/5 md:bg-amber-500/10'
                  : 'text-neutral-500 hover:text-white'
              }`}
              onClick={() => {
                setCurrentView('financial');
                setStartWithPlanModal(false);
              }}
            >
              <DollarSign size={22} />
              <span className="text-[9px] md:text-sm font-bold md:font-medium uppercase md:capitalize tracking-wider md:tracking-normal">
                Finance
              </span>
            </button>

            <button
              className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 p-2 rounded-xl flex-1 md:w-full md:px-4 transition-all ${
                currentView === 'settings'
                  ? 'text-amber-500 bg-amber-500/5 md:bg-amber-500/10'
                  : 'text-neutral-500 hover:text-white'
              }`}
              onClick={() => {
                setCurrentView('settings');
                setStartWithPlanModal(false);
              }}
            >
              <Settings size={22} />
              <span className="text-[9px] md:text-sm font-bold md:font-medium uppercase md:capitalize tracking-wider md:tracking-normal">
                Config
              </span>
            </button>
          </div>

          <div className="hidden md:flex md:mt-auto flex-col items-center w-full px-4 gap-4">
            <button
              onClick={handleLogout}
              className="flex flex-col md:flex-row items-center justify-start gap-1 md:gap-3 p-2 text-red-500 hover:text-red-400 rounded-lg w-full md:px-4 transition-colors"
            >
              <LogOut size={22} />
              <span className="text-[10px] md:text-sm font-medium">Sair</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {currentView === 'settings' && (
            <SettingsView
              user={user}
              onUpdateUser={handleUpdateUser}
              onLogout={handleLogout}
            />
          )}

          {currentView === 'financial' &&
            (user.role === UserRole.CLIENTE ? (
              <FinancialView
                user={user}
                initialShowModal={startWithPlanModal}
              />
            ) : (
              <BarberFinancialView user={user} />
            ))}

          {currentView === 'agenda' && isStaff && (
            <BarberAgendaView user={user} />
          )}

          {currentView === 'marketplace' &&
            (user.role === UserRole.CLIENTE || isAdmin) && (
              <MarketplaceView user={user} />
            )}

          {currentView === 'main' && (
            <>
              {user.role === UserRole.CLIENTE && (
                <ClienteApp
                  user={user}
                  onUpgradeClick={() => {
                    setStartWithPlanModal(true);
                    setCurrentView('financial');
                  }}
                />
              )}
              {user.role === UserRole.BARBEIRO && (
                <BarberDashboard user={user} />
              )}
              {user.role === UserRole.ADMIN && <AdminDashboard user={user} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
