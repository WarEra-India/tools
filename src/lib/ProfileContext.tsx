import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { fetchFullProfileById, type FullProfile } from "./wareraApi";

interface ProfileState {
  profile: FullProfile | null;
  loading: boolean;
  error: string | null;
  loadProfile: (userId: string) => Promise<void>;
  clearProfile: () => void;
}

const ProfileContext = createContext<ProfileState | null>(null);

const STORAGE_KEY = "warera-profile-userid";

function loadUserIdFromStorage(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function saveUserIdToStorage(userId: string | null) {
  if (userId) {
    localStorage.setItem(STORAGE_KEY, userId);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFullProfileById(userId);
      setProfile(data);
      saveUserIdToStorage(userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
      setProfile(null);
      saveUserIdToStorage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount, re-fetch profile if a userId was previously stored
  useEffect(() => {
    const stored = loadUserIdFromStorage();
    if (stored) loadProfile(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(null);
    setError(null);
    saveUserIdToStorage(null);
  }, []);

  return (
    <ProfileContext value={{ profile, loading, error, loadProfile, clearProfile }}>
      {children}
    </ProfileContext>
  );
}

export function useProfile(): ProfileState {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}
