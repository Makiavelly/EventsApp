import { ImagePlus, Palette, SmilePlus, Undo2 } from "lucide-react";
import { useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { EventMarker } from "../api/types";
import { prepareEventMarkerImage } from "../utils/eventMarkerImage";
import { EventMarkerPreview } from "./EventMarkerPreview";
import { Input } from "./Input";

type MarkerKind = EventMarker["kind"] | "none";

type EventMarkerPickerProps = {
  value: EventMarker | null;
  onChange: (value: EventMarker | null) => void;
  onProcessingChange?: (processing: boolean) => void;
  disabled?: boolean;
};

const emojiSuggestions = ["⚽", "🏀", "🏐", "🎾", "🏓", "🎲", "🃏", "🎮", "🎨", "🎸", "🎬", "📚", "☕", "🍕", "🔥", "🎉", "💬", "😊"];
const colorSuggestions = ["#B15B3E", "#E58A5F", "#F2B56B", "#708D5D", "#4F8794", "#6F63A6", "#C05C7E", "#4F4039"];

export function EventMarkerPicker({ value, onChange, onProcessingChange, disabled = false }: EventMarkerPickerProps) {
  const [activeKind, setActiveKind] = useState<MarkerKind>(value?.kind ?? "none");
  const [emoji, setEmoji] = useState(value?.kind === "emoji" ? value.value : "⚽");
  const [color, setColor] = useState(value?.kind === "color" ? value.value : "#B15B3E");
  const [imageError, setImageError] = useState<string>();
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function chooseKind(kind: MarkerKind) {
    setActiveKind(kind);
    setImageError(undefined);
    if (kind === "none") onChange(null);
    if (kind === "emoji") onChange({ kind, value: emoji });
    if (kind === "color") onChange({ kind, value: color });
    if (kind === "image" && value?.kind !== "image") onChange(null);
  }

  function changeEmoji(nextEmoji: string) {
    const limited = [...nextEmoji].slice(0, 64).join("");
    setEmoji(limited);
    onChange(limited.trim() ? { kind: "emoji", value: limited } : null);
  }

  function changeColor(nextColor: string) {
    setColor(nextColor);
    onChange({ kind: "color", value: nextColor });
  }

  async function changeImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setProcessing(true);
    onProcessingChange?.(true);
    setImageError(undefined);
    try {
      const image = await prepareEventMarkerImage(file);
      setActiveKind("image");
      onChange({ kind: "image", value: image });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Не удалось обработать изображение.");
    } finally {
      setProcessing(false);
      onProcessingChange?.(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-4 rounded-app bg-soft/65 p-4">
        <EventMarkerPreview marker={value} size="lg" className="shrink-0" />
        <div>
          <h2 className="text-base font-black text-ink">Маячок на карте</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink/65">Эмодзи и прозрачные картинки показываются без фона и обводки.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Вид маячка">
        <KindOption kind="none" active={activeKind} onChoose={chooseKind} icon={<Undo2 size={20} />} label="Без выбора" disabled={disabled} />
        <KindOption kind="emoji" active={activeKind} onChoose={chooseKind} icon={<SmilePlus size={20} />} label="Эмодзи" disabled={disabled} />
        <KindOption kind="color" active={activeKind} onChoose={chooseKind} icon={<Palette size={20} />} label="Цвет" disabled={disabled} />
        <KindOption kind="image" active={activeKind} onChoose={chooseKind} icon={<ImagePlus size={20} />} label="Картинка" disabled={disabled} />
      </div>

      {activeKind === "none" ? (
        <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink/65">На карте появится спокойный бежевый кружок.</p>
      ) : null}

      {activeKind === "emoji" ? (
        <div className="grid gap-4">
          <Input
            label="Любой эмодзи"
            name="event_marker_emoji"
            value={emoji}
            onChange={(event) => changeEmoji(event.target.value)}
            disabled={disabled}
            placeholder="Например, ⚽ или 😊"
            hint="Можно выбрать любой смайлик — тематика события не ограничивает выбор."
          />
          <div className="flex flex-wrap gap-2" aria-label="Быстрый выбор эмодзи">
            {emojiSuggestions.map((item) => (
              <button key={item} type="button" onClick={() => changeEmoji(item)} disabled={disabled} className={`focus-ring grid h-11 w-11 place-items-center rounded-xl border text-2xl transition ${emoji === item ? "border-cocoa bg-peach/25" : "border-line bg-surface hover:bg-soft"}`} aria-label={`Выбрать ${item}`}>{item}</button>
            ))}
          </div>
        </div>
      ) : null}

      {activeKind === "color" ? (
        <div className="grid gap-4">
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 text-sm font-bold text-ink">
            Свой цвет
            <input type="color" value={color} onChange={(event) => changeColor(event.target.value.toUpperCase())} disabled={disabled} className="focus-ring h-11 w-16 cursor-pointer rounded-xl border border-line bg-transparent p-1" />
          </label>
          <div className="flex flex-wrap gap-3" aria-label="Палитра маячка">
            {colorSuggestions.map((item) => (
              <button key={item} type="button" onClick={() => changeColor(item)} disabled={disabled} className={`focus-ring rounded-full p-1 ${color === item ? "ring-2 ring-cocoa ring-offset-2 ring-offset-surface" : ""}`} aria-label={`Выбрать цвет ${item}`}>
                <EventMarkerPreview marker={{ kind: "color", value: item }} size="sm" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {activeKind === "image" ? (
        <div className="grid gap-3">
          <input ref={fileRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={changeImage} disabled={disabled || processing} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={disabled || processing} className="focus-ring flex min-h-24 items-center justify-center gap-3 rounded-2xl border border-dashed border-cocoa/50 bg-surface px-5 text-sm font-extrabold text-cocoa transition hover:bg-soft disabled:opacity-50">
            <ImagePlus size={24} /> {processing ? "Готовим изображение…" : value?.kind === "image" ? "Заменить изображение" : "Выбрать изображение"}
          </button>
          <p className="text-xs leading-relaxed text-ink/55">PNG, JPEG, GIF или WebP до 10 МБ. Файл уменьшается и обрезается по круглой границе; прозрачные области остаются прозрачными.</p>
          {imageError ? <p role="alert" className="text-sm font-semibold text-clay">{imageError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function KindOption({ kind, active, onChoose, icon, label, disabled }: { kind: MarkerKind; active: MarkerKind; onChoose: (kind: MarkerKind) => void; icon: ReactNode; label: string; disabled: boolean }) {
  const selected = kind === active;
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={() => onChoose(kind)} disabled={disabled} className={`focus-ring flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-extrabold transition ${selected ? "border-cocoa bg-peach/25 text-cocoa" : "border-line bg-surface text-ink hover:bg-soft"}`}>
      {icon}
      {label}
    </button>
  );
}
