import { useState, useEffect } from "react";
import { FolderOutput, Plus, Trash2, X, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SimEquipmentState } from "./Simulator";

export type WarRoomPreset = {
  id: string;
  name: string;
  state: SimEquipmentState;
  createdAt: number;
};

export default function PresetManager({
  currentSimState,
  onLoadPreset,
  refreshKey,
}: {
  currentSimState: SimEquipmentState;
  onLoadPreset: (presetData: SimEquipmentState) => void;
  refreshKey?: number;
}) {
  const [presets, setPresets] = useState<WarRoomPreset[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("war-room-presets");
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse presets", e);
      }
    }
  }, [refreshKey]);

  const savePresetsToStorage = (newPresets: WarRoomPreset[]) => {
    setPresets(newPresets);
    localStorage.setItem("war-room-presets", JSON.stringify(newPresets));
  };

  const handleSave = () => {
    if (!newPresetName.trim()) {
      setError("Please enter a preset name.");
      return;
    }
    setError(null);
    const newPreset: WarRoomPreset = {
      id: crypto.randomUUID(),
      name: newPresetName.trim(),
      state: structuredClone(currentSimState),
      createdAt: Date.now(),
    };
    savePresetsToStorage([...presets, newPreset]);
    setNewPresetName("");
  };

  const handleDelete = (id: string) => {
    savePresetsToStorage(presets.filter(p => p.id !== id));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all border border-zinc-700/50"
        >
          <FolderOutput className="h-4 w-4" />
          Presets
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[320px] p-0 overflow-hidden bg-zinc-900 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Saved Loadouts</span>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-zinc-800 rounded-md transition-colors">
            <X className="h-4 w-4 text-zinc-500" />
          </button>
        </div>

        <div className="p-3 flex flex-col gap-3">
          {/* Create new preset */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="New preset name..."
                value={newPresetName}
                onChange={(e) => { setNewPresetName(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                autoFocus
              />
              <button
                onClick={handleSave}
                className="h-[30px] px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg flex items-center justify-center transition-colors border border-zinc-700/50"
                title="Save Current Loadout"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-red-400 text-[10px] px-1">
                <AlertCircle className="h-3 w-3" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="h-[1px] bg-zinc-800/50" />

          {/* List presets */}
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {presets.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-500 font-medium">
                No presets saved yet.
              </div>
            ) : (
              presets.map(preset => (
                <div key={preset.id} className="flex items-center justify-between group bg-zinc-950/50 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all p-1.5">
                  <button
                    onClick={() => {
                      onLoadPreset(preset.state);
                      setIsOpen(false);
                    }}
                    className="flex flex-col items-start flex-1 px-2 py-1 overflow-hidden"
                  >
                    <span className="text-xs font-bold text-zinc-300 truncate w-full text-left">
                      {preset.name}
                    </span>
                    <span className="text-[9px] text-zinc-600">
                      {new Date(preset.createdAt).toLocaleDateString()} {new Date(preset.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(preset.id)}
                    className="p-1.5 hover:bg-red-500/10 text-zinc-600 hover:text-red-400 rounded-md transition-colors"
                    title="Delete Preset"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
