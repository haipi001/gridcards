"use client";

// Identity + data controls.
//
// The handle and bio exist so posts and comments have an author; the backup
// controls exist because everything lives in this browser and a cache clear
// would otherwise take the whole collection with it. Photo bytes cannot be
// exported (they are blobs in IndexedDB), and the panel says so rather than
// writing a backup that silently loses them.

import { useRef, useState, useSyncExternalStore } from "react";
import {
  AVATARS,
  avatarCss,
  readProfile,
  saveProfile,
  SERVER_PROFILE,
  profileSnapshot,
  subscribeProfile,
} from "@/lib/profile";
import { clearLocalData, exportLocalData, importLocalData } from "@/lib/localData";
import { clearClaims, subscribeClaims, claimsSnapshot, NO_CLAIMS } from "@/lib/claims";
import { clearPosts, subscribePosts, postsSnapshot, NO_POSTS } from "@/lib/social";
import { clearWatchlist, subscribeWatch, watchlistSnapshot, NO_ENTRIES } from "@/lib/watchlist";

export default function DataPanel() {
  const profile = useSyncExternalStore(
    subscribeProfile,
    profileSnapshot,
    () => SERVER_PROFILE,
  );
  const claims = useSyncExternalStore(subscribeClaims, claimsSnapshot, () => NO_CLAIMS);
  const posts = useSyncExternalStore(subscribePosts, postsSnapshot, () => NO_POSTS);
  const watch = useSyncExternalStore(subscribeWatch, watchlistSnapshot, () => NO_ENTRIES);

  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio);
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const download = () => {
    const blob = new Blob([exportLocalData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gridcards-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("已导出 JSON 备份（实拍图不在其中）");
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    const res = importLocalData(await file.text());
    setMsg(res.message);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="dataPanel">
      <section className="panel">
        <h3>身份</h3>
        <p className="mut">
          这个名字会出现在你的帖子、评论与认领备注上。只存在这台设备，不需要注册。
        </p>
        <div className="formGrid" style={{ marginTop: 14 }}>
          <label className="field">
            <span>Handle</span>
            <div className="handleInput">
              <b>@</b>
              <input
                className="input"
                value={handle}
                maxLength={24}
                onChange={(e) => setHandle(e.target.value.replace(/[^\w一-龥-]/g, ""))}
              />
            </div>
          </label>
          <label className="field">
            <span>简介</span>
            <input
              className="input"
              value={bio}
              maxLength={160}
              placeholder="主要收哪个车手 / 哪个系列"
              onChange={(e) => setBio(e.target.value)}
            />
          </label>
        </div>
        <div className="avatarPick">
          {AVATARS.map((_, i) => (
            <button
              type="button"
              key={i}
              className={profile.avatar === i ? "on" : ""}
              style={{ background: avatarCss(i) }}
              aria-label={`头像 ${i + 1}`}
              aria-pressed={profile.avatar === i}
              onClick={() => {
                saveProfile({ avatar: i });
                setSaved(true);
              }}
            />
          ))}
        </div>
        <div className="dataActions">
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              saveProfile({ handle: handle.trim() || "you", bio });
              setSaved(true);
              setMsg("已保存身份");
            }}
          >
            保存身份
          </button>
          {saved ? <span className="mut">已保存 · 当前 @{readProfile().handle}</span> : null}
        </div>
      </section>

      <section className="panel">
        <h3>备份与恢复</h3>
        <p className="mut">
          认领、帖子、关注都在这台设备的浏览器里。清缓存 / 换设备前先导出一份。
          实拍照片是 IndexedDB 里的二进制数据，无法打进 JSON，恢复后缺失的照片会显示为空框。
        </p>
        <div className="dataActions">
          <button type="button" className="btn" onClick={download}>
            导出 JSON 备份
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void restore(e.target.files?.[0])}
          />
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            从备份导入
          </button>
        </div>
        {msg ? <div className="dataMsg">{msg}</div> : null}
      </section>

      <section className="panel">
        <h3>清空本机数据</h3>
        <p className="mut">
          只影响这台设备，不会删除市场账本（挂单 / 报价 / 订单）。操作不可撤销，建议先导出。
        </p>
        <div className="dataActions">
          <button type="button" className="btn" onClick={() => clearClaims()}>
            清空认领（{claims.length}）
          </button>
          <button type="button" className="btn" onClick={() => clearPosts()}>
            清空帖子（{posts.length}）
          </button>
          <button type="button" className="btn" onClick={() => clearWatchlist()}>
            清空关注（{watch.length}）
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              if (
                window.confirm(
                  "这会清空认领、帖子、关注与身份设置（不含市场账本与实拍图字节）。确定？",
                )
              ) {
                clearLocalData("all");
                setMsg("本机社交 / 收藏数据已清空");
              }
            }}
          >
            全部清空
          </button>
        </div>
      </section>
    </div>
  );
}
