import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'supplier';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  supplierName?: string;
  supplierId?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo users for testing
const DEMO_USERS = [
  {
    id: '1',
    email: 'admin@demo',
    password: 'Passw0rd!',
    role: 'admin' as UserRole,
    supplierName: 'Admin User'
  },
  {
    id: '2',
    email: 'supplier@demo',
    password: 'Passw0rd!',
    role: 'supplier' as UserRole,
    supplierName: 'Demo Supplier',
    supplierId: 'SUP001'
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('markaz_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('markaz_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const demoUser = DEMO_USERS.find(u => u.email === email && u.password === password);
    
    if (demoUser) {
      const { password: _, ...userWithoutPassword } = demoUser;
      setUser(userWithoutPassword);
      localStorage.setItem('markaz_user', JSON.stringify(userWithoutPassword));
      setIsLoading(false);
      return true;
    }

    // TODO: In production, integrate with Google Sheets API to validate users
    // from the profiles tab of the Google Sheet
    
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('markaz_user');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};