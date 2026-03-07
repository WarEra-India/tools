import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { fetchFullProfile, type FullProfile } from "./wareraApi";

interface ProfileState {
  profile: FullProfile | null;
  loading: boolean;
  error: string | null;
  loadProfile: (username: string) => Promise<void>;
  clearProfile: () => void;
}

const ProfileContext = createContext<ProfileState | null>(null);

const STORAGE_KEY = "warera-profile-id";

function loadUsernameFromStorage(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function saveUsernameToStorage(username: string | null) {
  if (username) {
    localStorage.setItem(STORAGE_KEY, username);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount, re-fetch profile if a username was previously stored
  const loadProfile = useCallback(async (username: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFullProfile(username);
      setProfile(data);
      saveUsernameToStorage(username);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
      setProfile(null);
      saveUsernameToStorage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = loadUsernameFromStorage();
    if (stored) loadProfile(stored);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(null);
    setError(null);
    saveUsernameToStorage(null);
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
