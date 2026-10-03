"use client";

// Write a post. Text, up to three photos, and optionally one card you already
// claimed — attaching a claim keeps the post honest: it points at something the
// visitor says they actually hold instead of a made-up card.

import { useSyncExternalStore, useState } from "react";
import PhotoPicker, { type PickedPhoto } from "@/components/upload/PhotoPicker";
import {
  claimsSnapshot,
  NO_CLAIMS,
  subscribeClaims,
} from "@/lib/claims";
import {
  SERVER_PROFILE,
  profileSnapshot,
  subscribeProfile,
} from "@/lib/profile";
import { CLOUD, STORAGE_NOTE } from "@/lib/backend";
import { storeIngested } from "@/lib/upload/store";
import { storeIngestedCloud } from "@/lib/upload/storeCloud";
import { createPost as createPostCloud, newPostId, type PostCardRef } from "@/lib/socialCloud";
import { createPost as createPostLocal } from "@/lib/social";
import { useSession } from "@/lib/auth";
import { openAuthModal } from "@/lib/authModal";

const MAX_PHOTOS = 3;

export default function Composer() {
  const profile = useSyncExternalStore(
    subscribeProfile,
    profileSnapshot,
    () => SERVER_PROFILE,
  );
  const claims = useSyncExternalStore(subscribeClaims, claimsSnapshot, () => NO_CLAIMS);
  const { user } = useSession();

  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [card, setCard] = useState<PostCardRef | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPost = !busy && (text.trim().length > 0 || photos.length > 0);

  const submit = async () => {
    if (!canPost) return;
    if (CLOUD && !user) {
      openAuthModal();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Bytes before metadata: a failed encode must not leave a dangling ref.
      const id = newPostId();
      if (CLOUD) {
        const images = [];
        for (const [i, p] of photos.entries()) {
          images.push(await storeIngestedCloud(p.result, `post:${id}:${i}`));
        }
        await createPostCloud({ id, author: profile.handle, text, images, card });
      } else {
        const images = [];
        for (const [i, p] of photos.entries()) {
          images.push(await storeIngested(p.result, `post:${id}:${i}`));
        }
        createPostLocal({ id, author: profile.handle, text, images, card });
      }
      setText("");
      setPhotos([]);
      setCard(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "发布失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="composer">
      <div className="composerTop">
        <i className="miniAvatar" aria-hidden />
        <textarea
          value={text}
          maxLength={600}
          placeholder="晒一张卡、讲一段收藏故事，或者写下你正在找的编号…（#话题 会自动识别）"
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div className="composerExtra">
        <PhotoPicker value={photos} onChange={setPhotos} max={MAX_PHOTOS} hint="晒卡照片" />
      </div>

      {card ? (
        <div className="composerCard">
          <span className="eyebrow">附加的卡</span>
          <b>{card.title}</b>
          <button type="button" className="link" onClick={() => setCard(null)}>
            移除
          </button>
        </div>
      ) : null}

      {attachOpen && !card && (
        <div className="composerAttach">
          <span className="mut">从你认领的卡里选一张：</span>
          {claims.length === 0 ? (
            <span className="mut">还没有认领记录 · 在卡谱或市场页点「认领」</span>
          ) : (
            <div className="composerClaimList">
              {claims.slice(0, 12).map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => {
                    setCard({ title: c.title, subtitle: c.player, href: c.href });
                    setAttachOpen(false);
                  }}
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="composerFoot">
        <div className="composerTools">
          <span className={`tool toolStatic${photos.length ? " on" : ""}`}>
            ▧ Photo · {photos.length}/{MAX_PHOTOS}
          </span>
          <button
            type="button"
            className={`tool${attachOpen || card ? " on" : ""}`}
            onClick={() => setAttachOpen((v) => !v)}
          >
            ＋ Card
          </button>
          <span className="toolCount">{text.length}/600</span>
        </div>
        <button
          type="button"
          className="btn primary"
          disabled={!canPost}
          onClick={() => void submit()}
        >
          {busy ? "发布中…" : "Post"}
        </button>
      </div>

      {error ? <div className="uploadError">{error}</div> : null}
      <p className="composerNote">
        {CLOUD
          ? "内容会保存到云端，所有登录用户都能看到。"
          : STORAGE_NOTE}
      </p>
    </div>
  );
}
