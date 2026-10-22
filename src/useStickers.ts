import { useCallback, useEffect, useMemo, useState } from "react";
import type { Asset, StickerPlacement } from "./types";
import { loadImage } from "./imaging";
const EMPTY: Asset[] = [];
export function useStickers(
  eventId: string | undefined,
  eventAssets: Asset[] | undefined,
  onError: (error: unknown) => void,
) {
  const assets = eventAssets ?? EMPTY;
  const permitted = useMemo(
    () => assets.filter((a) => a.enabled && a.kind === "sticker"),
    [assets],
  );
  const [images, setImages] = useState<Map<string, HTMLImageElement>>(
    new Map(),
  );
  const [placements, setPlacements] = useState<StickerPlacement[]>([]);
  useEffect(() => {
    setPlacements([]);
  }, [eventId]);
  useEffect(() => {
    let cancelled = false;
    setPlacements((current) =>
      current.filter((p) => permitted.some((a) => a.id === p.assetId)),
    );
    Promise.all(
      permitted.map(async (asset) => {
        try {
          return [asset.id, await loadImage(asset.data)] as const;
        } catch (error) {
          if (!cancelled)
            onError(
              new Error(`Sticker illisible : ${asset.name}. ${String(error)}`),
            );
          return null;
        }
      }),
    ).then((entries) => {
      if (!cancelled)
        setImages(
          new Map(
            entries.filter(
              (entry): entry is readonly [string, HTMLImageElement] =>
                entry !== null,
            ),
          ),
        );
    });
    return () => {
      cancelled = true;
    };
  }, [permitted, onError]);
  const add = useCallback(
    (assetId: string) => {
      const image = images.get(assetId);
      if (!image || !permitted.some((a) => a.id === assetId)) return;
      const width = Math.min(0.22, (0.4 * 0.75 * image.width) / image.height),
        height = (((width * 4) / 3) * image.height) / image.width;
      setPlacements((current) => [
        ...current,
        { id: crypto.randomUUID(), assetId, x: 0.5, y: 0.5, width, height },
      ]);
    },
    [images, permitted],
  );
  const move = useCallback(
    (id: string, x: number, y: number) =>
      setPlacements((current) =>
        current.map((p) =>
          p.id === id
            ? {
                ...p,
                x: Math.max(p.width / 2, Math.min(1 - p.width / 2, x)),
                y: Math.max(p.height / 2, Math.min(1 - p.height / 2, y)),
              }
            : p,
        ),
      ),
    [],
  );
  const remove = useCallback(
    (id: string) =>
      setPlacements((current) => current.filter((p) => p.id !== id)),
    [],
  );
  const clear = useCallback(() => setPlacements([]), []);
  const rendered = useMemo(
    () =>
      placements.flatMap((placement) => {
        const image = images.get(placement.assetId);
        return image && permitted.some((a) => a.id === placement.assetId)
          ? [{ placement, image }]
          : [];
      }),
    [placements, images, permitted],
  );
  return {
    assets: permitted,
    placements,
    rendered,
    images,
    add,
    move,
    remove,
    clear,
  };
}
