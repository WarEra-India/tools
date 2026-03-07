import { X, User, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useProfile } from "@/lib/ProfileContext";
import ProfileSearchBar from "@/components/ProfileSearchBar";

export default function ProfileWidget() {
  const { profile, clearProfile } = useProfile();

  return (
    <Card className="mb-6">
      <CardContent className="pt-5">
        {!profile ? (
          <ProfileSearchBar />
        ) : (
          <div className="flex items-center gap-3">
            <img
              src={profile.user.avatarUrl}
              alt={profile.user.username}
              className="h-10 w-10 rounded-full border border-zinc-700 object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-zinc-400" />
                <span className="font-semibold truncate">
                  {profile.user.username}
                </span>
                <span className="text-xs text-zinc-500">
                  Lv.{profile.user.leveling.level}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Building2 className="h-3 w-3" />
                {profile.companies.length}/{profile.user.skills.companies?.total ?? "?"} companies
              </div>
            </div>
            <button
              onClick={clearProfile}
              className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              aria-label="Remove profile"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
