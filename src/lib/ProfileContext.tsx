import {
  createContext,
  useContext,
  useState,
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

const STORAGE_KEY = "warera-profile";

function loadFromStorage(): FullProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FullProfile) : null;
  } catch {
    return null;
  }
}

function saveToStorage(profile: FullProfile | null) {
  if (profile) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<FullProfile | null>(loadFromStorage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (username: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFullProfile(username);
      setProfile(data);
      saveToStorage(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
      setProfile(null);
      saveToStorage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(null);
    setError(null);
    saveToStorage(null);
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
