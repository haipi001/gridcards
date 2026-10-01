"use client";

// The claim dialog: name what you hold, prove it with a photo.
//
// Two shapes, one record:
//   card scope    → "I hold a copy of #7" (no serial to name)
//   edition scope → "I hold 03/50 and 07/50"
//
// Both accept up to three photos as evidence. Pictures go through the /sell
// ingest pipeline first (magic bytes checked, EXIF/GPS stripped by the canvas
// re-encode), then the bytes are written and only the pointer lands in the
// claim record.
//
// The copy is deliberately plain about what this is: a personal note on this
// device. It is not a grade, not an appraisal and not an ownership transfer —
// ownership only moves when an Order reaches COMPLETED (DEV_AGENTS.md).

import { useMemo, useState, useSyncExternalStore } from "react";
import Modal from "@/components/Modal";
import PhotoPicker, { type PickedPhoto } from "@/components/upload/PhotoPicker";
import { useBlobUrls } from "@/lib/useBlobUrl";
import { storeIngested, type StoredPhoto } from "@/lib/upload/store";
import {
  addEvidence,
  claimsSnapshot,
  NO_CLAIMS,
  removeClaim,
  removeEvidence,
  serialLabel,
  subscribeClaims,
  toggleCardClaim,
  toggleSerial,
  updateNote,
  type Claim,
  type ClaimEntry,
} from "@/lib/claims";

const MAX_PHOTOS = 3;

function EvidenceStrip({
  claim,
  onRemove,
}: {
  claim: Claim;
  onRemove: (id: string) => void;
}) {
  const refs = useMemo(() => claim.evidence.map((e) => e.thumb), [claim.evidence]);
  const urls = useBlobUrls(refs);

  if (claim.evidence.length === 0) return null;
  return (
    <div className="evidenceStrip">
      {claim.evidence.map((e, i) => (
        <div className="evidenceItem" key={e.id}>
          {urls[i] ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={urls[i] as string} alt="已上传的实拍证据" />
          ) : (
            <i className="evidenceEmpty" />
          )}
          <button type="button" onClick={() => onRemove(e.id)} aria-label="删除这张证据">
            删除
          </button>
        </div>
      ))}
    </div>
  );
}

export default function ClaimDialog({
  entry,
  open,
  onClose,
}: {
  entry: ClaimEntry;
  open: boolean;
  onClose: () => void;
}) {
  const scope = entry.scope ?? "edition";
  const run = entry.run;

  // Live read: another tab, or the profile page, can change the claim while
  // this dialog is open — so it mirrors the store instead of copying it.
  const claims = useSyncExternalStore(subscribeClaims, claimsSnapshot, () => NO_CLAIMS);
  const claim = claims.find((c) => c.id === entry.id) ?? null;

  // The dialog is mounted only while open (see ClaimButton), so the first
  // render already has the stored claim — no effect, no cascading render.
  const [serials, setSerials] = useState<number[]>(() => claim?.serials ?? []);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [note, setNote] = useState(() => claim?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);

  const owned = claim?.serials ?? [];
  const held = scope === "card" ? Boolean(claim) : owned.length > 0;
  const dirtySerials =
    scope === "edition" &&
    (serials.some((n) => !owned.includes(n)) || owned.some((n) => !serials.includes(n)));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      // 1. bytes first — a failed encode must never leave a dangling pointer.
      const stored: StoredPhoto[] = [];
      for (const [i, p] of photos.entries()) {
        const ns = `claim:${entry.id}:${Date.now()}-${i}`;
        const s = await storeIngested(p.result, ns);
        stored.push(s);
      }
      // 2. then the metadata that points at them.
      for (const s of stored) {
        addEvidence(entry, {
          id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          thumb: s.thumb,
          full: s.full,
          at: Date.now(),
        });
      }
      if (scope === "card") {
        if (!claim) toggleCardClaim(entry);
      } else {
        for (const n of serials) if (!owned.includes(n)) toggleSerial(entry, n);
        for (const n of owned) if (!serials.includes(n)) toggleSerial(entry, n);
      }
      if (note !== (claim?.note ?? "")) updateNote(entry.id, note.trim());
      setPhotos([]);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  const release = () => {
    removeClaim(entry.id);
    setSerials([]);
    setNote("");
    setConfirmRelease(false);
    onClose();
  };

  const canSave =
    !busy &&
    (photos.length > 0 ||
      dirtySerials ||
      (scope === "card" && !claim) ||
      note !== (claim?.note ?? ""));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={scope === "card" ? "认领这张卡" : "认领编号"}
      wide
      footer={
        <div className="dialogFoot">
          {claim ? (
            confirmRelease ? (
              <span className="dialogWarn">
                取消认领会同时移除 {claim.evidence.length} 张实拍证据
                <button type="button" className="link" onClick={release}>
                  确认移除
                </button>
                <button type="button" className="link" onClick={() => setConfirmRelease(false)}>
                  取消
                </button>
              </span>
            ) : (
              <button type="button" className="link" onClick={() => setConfirmRelease(true)}>
                取消认领
              </button>
            )
          ) : (
            <span className="dialogHint">仅记录在这台设备上</span>
          )}
          <span className="dialogSpacer" />
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            关闭
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => void save()}
            disabled={!canSave}
          >
            {busy ? "保存中…" : claim ? "更新认领" : "提交认领"}
          </button>
        </div>
      }
    >
      <div className="claimSummary">
        <b>
          {entry.title}
          {held ? <span className="scopeTag card" style={{ marginLeft: 8 }}>已认领</span> : null}
        </b>
        <span className="mut">
          {entry.player}
          {run > 0 ? ` · 限量 ${run}` : ""} · {scope === "card" ? "整卡认领" : "按编号认领"}
        </span>
      </div>

      {scope === "edition" && run > 1 && (
        <div className="formSection">
          <h4>选择你持有的编号</h4>
          <div className="serialMap dialogSerials">
            {Array.from({ length: run }, (_, i) => i + 1).map((n) => {
              const on = serials.includes(n);
              return (
                <button
                  type="button"
                  key={n}
                  className={`serialDot${on ? " owned" : ""}`}
                  aria-pressed={on}
                  onClick={() =>
                    setSerials((prev) =>
                      prev.includes(n)
                        ? prev.filter((x) => x !== n)
                        : [...prev, n].sort((a, b) => a - b),
                    )
                  }
                >
                  {serialLabel(n, run).split("/")[0]}
                </button>
              );
            })}
          </div>
          <p className="mut">
            已选 {serials.length} / {run}
            {serials.length > 0 && ` · ${serials.map((n) => serialLabel(n, run)).join(" · ")}`}
          </p>
        </div>
      )}

      {scope === "edition" && run <= 1 && (
        <div className="formSection">
          <h4>持有数量</h4>
          <div className="toggleGrid">
            <button
              type="button"
              className={`toggleCard${serials.length > 0 ? " active" : ""}`}
              aria-pressed={serials.length > 0}
              onClick={() => setSerials(serials.length > 0 ? [] : [1])}
            >
              <b>{serials.length > 0 ? "已标记持有 ✓" : "我持有一张"}</b>
              <span className="mut">{run === 1 ? "1/1 · 唯一一张" : "该版本无编号"}</span>
            </button>
          </div>
        </div>
      )}

      <div className="formSection">
        <h4>实拍证据（{claim?.evidence.length ?? 0} 张已存 · 最多再传 {MAX_PHOTOS} 张）</h4>
        {claim ? (
          <EvidenceStrip
            claim={claim}
            onRemove={(id) => removeEvidence(entry.id, id)}
          />
        ) : null}
        <PhotoPicker value={photos} onChange={setPhotos} max={MAX_PHOTOS} />
      </div>

      <div className="formSection">
        <h4>备注</h4>
        <textarea
          className="dialogText"
          value={note}
          maxLength={200}
          placeholder="购入渠道、品相、证书号…写给自己看的，不会公开"
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error ? <div className="uploadError">{error}</div> : null}
    </Modal>
  );
}
