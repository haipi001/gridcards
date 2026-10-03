"use client";

// One post. Photos come out of IndexedDB through BlobRef → object URL, the
// like and comment controls write the same local store, and the demo seed is
// labelled as such so nobody mistakes it for a real collector.

import Link from "next/link";
import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { useBlobUrls } from "@/lib/useBlobUrl";
import { avatarCss } from "@/lib/profile";
import { timeAgo, type Post } from "@/lib/social";
import { CLOUD } from "@/lib/backend";
import * as localStore from "@/lib/social";
import * as cloudStore from "@/lib/socialCloud";
import { useMounted } from "@/lib/browserStore";

/** Same function names, two backends — see lib/backend.ts for the switch. */
const store = CLOUD ? cloudStore : localStore;

export default function PostCard({
  post,
  myHandle,
  myAvatar,
}: {
  post: Post;
  myHandle: string;
  myAvatar: number;
}) {
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const thumbs = useMemo(() => post.images.map((i) => i.thumb), [post.images]);
  const fulls = useMemo(() => post.images.map((i) => i.full), [post.images]);
  const thumbUrls = useBlobUrls(thumbs);
  const fullUrls = useBlobUrls(fulls);

  const avatar =
    post.avatar ?? (post.mine ? avatarCss(myAvatar) : avatarCss(0));
  const authorLabel = `@${post.author}`;
  const isMine = post.mine;

  return (
    <article className="post">
      <div className="postHead">
        <i className="miniAvatar" style={{ background: avatar }} aria-hidden />
        <div className="who">
          <b>
            {authorLabel}
            {isMine ? <span className="postYou">YOU</span> : null}
          </b>
          <span>
            {post.demo
              ? `${post.timeLabel ?? ""} · demo`
              : mounted
                ? `${timeAgo(post.at)} · 仅本机可见`
                : "仅本机可见"}
          </span>
        </div>
        {isMine && !post.demo ? (
          <button
            type="button"
            className="postDelete"
            onClick={() => void store.removePost(post.id)}
            aria-label="删除这条帖子"
          >
            删除
          </button>
        ) : post.demo ? (
          <span className="soonTag">DEMO</span>
        ) : null}
      </div>

      {post.text ? <div className="postText">{post.text}</div> : null}

      {post.images.length > 0 && (
        <div className={`postImages n${Math.min(post.images.length, 3)}`}>
          {post.images.map((img, i) => (
            <button
              type="button"
              key={img.thumb.kind === "idb" ? img.thumb.key : img.thumb.url}
              className="postImage"
              onClick={() => setZoom(i)}
              aria-label={`查看第 ${i + 1} 张实拍图`}
            >
              {thumbUrls[i] ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={thumbUrls[i] as string} alt={`实拍图 ${i + 1}`} />
              ) : (
                <i className="postImageEmpty" aria-hidden />
              )}
            </button>
          ))}
        </div>
      )}

      {post.card && (
        <div className="postCard">
          <div className="postCardVisual">
            <i className="postCardMark" aria-hidden />
          </div>
          <div className="postCardBody">
            <div className="eyebrow">SHARED CARD</div>
            <h3>{post.card.title}</h3>
            <div className="mut">{post.card.subtitle}</div>
            <Link className="btn" style={{ marginTop: 15 }} href={post.card.href}>
              查看这张卡 →
            </Link>
          </div>
        </div>
      )}

      {post.topics.length > 0 && (
        <div className="postTopics">
          {post.topics.map((t) => (
            <span className="postTopic" key={t}>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Demo posts show their counts as plain text. Rendering them as
          *disabled* buttons was the "nothing is clickable" complaint: a greyed
          control that still looks interactive reads as a broken page. */}
      {post.demo ? (
        <div className="postActions">
          <span>♡ {post.likes}</span>
          <span>◌ {post.comments.length}</span>
          <span className="postDemoNote">演示内容 · 不可互动</span>
        </div>
      ) : (
        <div className="postActions">
          <button
            type="button"
            className={post.liked ? "on" : ""}
            onClick={() => void store.toggleLike(post.id)}
            aria-pressed={post.liked}
          >
            {post.liked ? "♥" : "♡"} {post.likes}
          </button>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            ◌ {post.comments.length}
          </button>
        </div>
      )}

      {open && !post.demo && (
        <div className="postComments">
          {post.comments.length === 0 ? (
            <p className="mut">还没有评论，来抢沙发。</p>
          ) : (
            post.comments.map((c) => (
              <div className="postComment" key={c.id}>
                <b>@{c.author}</b>
                <span>{c.text}</span>
                <em>{mounted ? timeAgo(c.at) : ""}</em>
                <button type="button" onClick={() => void store.removeComment(post.id, c.id)}>
                  删除
                </button>
              </div>
            ))
          )}
          <div className="postCommentForm">
            <input
              className="input"
              value={draft}
              maxLength={200}
              placeholder={`以 ${myHandle} 的身份评论…`}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft.trim()) {
                  void store.addComment(post.id, myHandle, draft);
                  setDraft("");
                }
              }}
            />
            <button
              type="button"
              className="btn"
              disabled={!draft.trim()}
              onClick={() => {
                void store.addComment(post.id, myHandle, draft);
                setDraft("");
              }}
            >
              发送
            </button>
          </div>
        </div>
      )}

      <Modal
        open={zoom !== null}
        onClose={() => setZoom(null)}
        title="实拍图"
        wide
      >
        {zoom !== null && fullUrls[zoom] ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className="postZoom" src={fullUrls[zoom] as string} alt="实拍图大图" />
        ) : (
          <p className="mut">这张图在本设备上已不可用。</p>
        )}
      </Modal>
    </article>
  );
}
