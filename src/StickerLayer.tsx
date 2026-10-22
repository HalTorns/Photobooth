import { useRef, useState, type PointerEvent } from "react";
import { Trash2 } from "lucide-react";
import type { Asset, StickerPlacement } from "./types";
type Props = {
  placements: StickerPlacement[];
  assets: Asset[];
  disabled: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
};
export default function StickerLayer({
  placements,
  assets,
  disabled,
  onMove,
  onRemove,
}: Props) {
  const layer = useRef<HTMLDivElement>(null),
    trash = useRef<HTMLButtonElement>(null);
  const drag = useRef<{
    id: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [selected, setSelected] = useState<string | null>(null),
    [dragging, setDragging] = useState<string | null>(null),
    [overTrash, setOverTrash] = useState(false);
  function hitsTrash(x: number, y: number) {
    const rect = trash.current?.getBoundingClientRect();
    return (
      !!rect &&
      x >= rect.left - 8 &&
      x <= rect.right + 8 &&
      y >= rect.top - 8 &&
      y <= rect.bottom + 8
    );
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current,
      rect = layer.current?.getBoundingClientRect();
    if (
      !current ||
      current.pointerId !== event.pointerId ||
      disabled ||
      !rect?.width ||
      !rect.height
    )
      return;
    event.preventDefault();
    setOverTrash(hitsTrash(event.clientX, event.clientY));
    onMove(
      current.id,
      (event.clientX - rect.left - current.offsetX) / rect.width,
      (event.clientY - rect.top - current.offsetY) / rect.height,
    );
  }
  function finish(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (!cancelled && !disabled && hitsTrash(event.clientX, event.clientY)) {
      onRemove(current.id);
      setSelected(null);
    }
    drag.current = null;
    setDragging(null);
    setOverTrash(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return (
    <div
      className={"sticker-layer" + (disabled ? " is-disabled" : "")}
      ref={layer}
    >
      {placements.map((p, index) => {
        const asset = assets.find((a) => a.id === p.assetId);
        if (!asset) return null;
        return (
          <button
            key={p.id}
            type="button"
            className={
              "placed-sticker" + (dragging === p.id ? " is-dragging" : "")
            }
            data-sticker-id={p.id}
            aria-label={`Déplacer le sticker ${asset.name} ${index + 1}`}
            disabled={disabled}
            style={{
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              width: `${p.width * 100}%`,
              height: `${p.height * 100}%`,
            }}
            onPointerDown={(event) => {
              if (disabled || event.button !== 0) return;
              const rect = layer.current?.getBoundingClientRect();
              if (!rect) return;
              event.preventDefault();
              event.currentTarget.focus({ preventScroll: true });
              drag.current = {
                id: p.id,
                pointerId: event.pointerId,
                offsetX: event.clientX - (rect.left + p.x * rect.width),
                offsetY: event.clientY - (rect.top + p.y * rect.height),
              };
              setSelected(p.id);
              setDragging(p.id);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={move}
            onPointerUp={(event) => finish(event)}
            onPointerCancel={(event) => finish(event, true)}
            onLostPointerCapture={() => {
              if (drag.current?.id === p.id) {
                drag.current = null;
                setDragging(null);
                setOverTrash(false);
              }
            }}
            onKeyDown={(event) => {
              if (disabled) return;
              const d = 0.02;
              if (event.key === "Delete" || event.key === "Backspace") {
                event.preventDefault();
                onRemove(p.id);
              } else if (
                ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  event.key,
                )
              ) {
                event.preventDefault();
                onMove(
                  p.id,
                  p.x +
                    (event.key === "ArrowLeft"
                      ? -d
                      : event.key === "ArrowRight"
                        ? d
                        : 0),
                  p.y +
                    (event.key === "ArrowUp"
                      ? -d
                      : event.key === "ArrowDown"
                        ? d
                        : 0),
                );
              }
            }}
          >
            <img src={asset.data} alt="" draggable={false} />
          </button>
        );
      })}
      {placements.length > 0 && !disabled && (
        <button
          type="button"
          ref={trash}
          className={"sticker-trash" + (overTrash ? " is-over" : "")}
          aria-label="Corbeille des stickers"
          title="Glissez un sticker ici pour le supprimer"
          onClick={() => {
            if (selected) {
              onRemove(selected);
              setSelected(null);
            }
          }}
        >
          <Trash2 size={24} />
        </button>
      )}
    </div>
  );
}
