import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { User } from '@supabase/supabase-js';
import { supabase } from "./lib/supabase";
import AuthForm from "./components/AuthForm";
import Dashboard from "./components/Dashboard";
import Profile from "./components/Profile";
import Sales from "./components/Sales";
import AdminDashboard from "./components/AdminDashboard";
import AdminSales from "./components/AdminSales";
import UserSales from "./components/UserSales";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Skontrolujeme počiatočný stav autentifikácie
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        checkAdminStatus(user.id);
      }
      setLoading(false);
    });

    // Sledujeme zmeny autentifikácie
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        checkAdminStatus(currentUser.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data);
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="text-xl text-gray-600">Načítava sa...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          !user ? (
            <div className="min-h-screen flex justify-center items-center bg-gray-50">
              <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
                <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                  Prihlásenie
                </h1>
                <AuthForm />
              </div>
            </div>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route
        path="/dashboard"
        element={user ? <Dashboard /> : <Navigate to="/" replace />}
      />
      <Route
        path="/profile"
        element={user ? <Profile /> : <Navigate to="/" replace />}
      />
      <Route
        path="/sales"
        element={user ? <UserSales /> : <Navigate to="/" replace />}
      />
      <Route
        path="/admin"
        element={
          user && isAdmin ? <AdminDashboard /> : 
          user ? <Navigate to="/dashboard" replace /> : 
          <Navigate to="/" replace />
        }
      />
      <Route
        path="/admin/sales"
        element={
          user && isAdmin ? <AdminSales /> : 
          user ? <Navigate to="/dashboard" replace /> : 
          <Navigate to="/" replace />
        }
      />
    </Routes>
  );
}