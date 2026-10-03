"use client";

// Email-only login/signup modal (web apps support email login only). Opened from
// anywhere via openAuthModal(); mounted once inside the community page.

import { useSyncExternalStore, useState } from "react";
import Modal from "@/components/Modal";
import { getCloud } from "@/lib/cloud";
import { authModalSnapshot, subscribeAuthModal, closeAuthModal } from "@/lib/authModal";

type Mode = "signin" | "signup" | "forgot";

export default function AuthModal() {
  const open = useSyncExternalStore(subscribeAuthModal, authModalSnapshot, () => false);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<{ email: string; verificationId: string; isExistingUser: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!open) return null;

  // Reset on close rather than in an effect: a setState inside an effect body
  // triggers a cascading render (and the lint rule forbids it).
  const close = () => {
    setError(null);
    setInfo(null);
    setPending(null);
    setMode("signin");
    closeAuthModal();
  };

  const c = getCloud();

  async function sendCode() {
    if (!c) return;
    if (!email) {
      setError("请输入邮箱");
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { data, error: e } = await c.auth.sendOtp({ email });
      if (e) {
        setError(e.message);
        return;
      }
      const d = data as { verificationId: string; isExistingUser: boolean } | null;
      if (!d) {
        setError("发送验证码失败，请重试");
        return;
      }
      setPending({ email, verificationId: d.verificationId, isExistingUser: d.isExistingUser });
      setInfo("验证码已发送到邮箱，请查收（也可能在垃圾邮件中）");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!c || !pending) {
      setError("请先获取验证码");
      return;
    }
    if (!code) {
      setError("请输入验证码");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await c.auth.verifyOtp({
        email: pending.email,
        verificationId: pending.verificationId,
        isExistingUser: pending.isExistingUser,
        token: code,
        password: pending.isExistingUser ? undefined : password,
      });
      if (e) {
        setError(e.message);
        return;
      }
      close();
    } finally {
      setBusy(false);
    }
  }

  async function passwordSignIn() {
    if (!c) return;
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await c.auth.signInWithPassword({ email, password });
      if (e) {
        setError("邮箱或密码错误");
        return;
      }
      close();
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    if (!c) return;
    if (!email) {
      setError("请输入邮箱");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await c.auth.resetPasswordForEmail(email);
      if (e) {
        setError(e.message);
        return;
      }
      setInfo("密码重置邮件已发送，请按邮件指引操作");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "forgot" ? "找回密码" : mode === "signup" ? "注册账号" : "登录 GRIDCARDS";

  return (
    <Modal open onClose={close} title={title}>
      {error ? <div className="uploadError">{error}</div> : null}
      {info ? (
        <p className="mut" style={{ margin: "0 0 10px" }}>
          {info}
        </p>
      ) : null}

      <label className="eyebrow" style={{ marginTop: 4 }}>
        邮箱
      </label>
      <input
        className="input"
        type="email"
        value={email}
        disabled={Boolean(pending)}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />

      {mode !== "forgot" && !pending ? (
        <>
          <label className="eyebrow" style={{ marginTop: 10 }}>
            密码{mode === "signup" ? "（注册时必填）" : ""}
          </label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "设置密码（至少 6 位）" : "输入密码"}
          />
        </>
      ) : null}

      {!pending ? (
        <div className="modalFoot" style={{ marginTop: 14 }}>
          {mode === "forgot" ? (
            <button className="btn primary" disabled={busy} onClick={forgot}>
              发送重置邮件
            </button>
          ) : (
            <>
              <button className="btn primary" disabled={busy} onClick={passwordSignIn}>
                密码登录
              </button>
              <button className="btn" disabled={busy} onClick={sendCode}>
                邮箱验证码{mode === "signup" ? "注册" : "登录"}
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <label className="eyebrow" style={{ marginTop: 10 }}>
            验证码
          </label>
          <input
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="邮箱中的 6 位验证码"
          />
          <div className="modalFoot" style={{ marginTop: 14 }}>
            <button className="btn primary" disabled={busy} onClick={verify}>
              验证并{mode === "signup" ? "注册" : "登录"}
            </button>
            <button className="btn" disabled={busy} onClick={sendCode}>
              重新发送
            </button>
          </div>
        </>
      )}

      <div className="modalFoot" style={{ marginTop: 16, borderTop: "1px solid var(--line, #222)", paddingTop: 12 }}>
        {mode === "signin" ? (
          <>
            <button className="link" onClick={() => { setMode("signup"); setPending(null); }}>
              没有账号？去注册
            </button>
            <button className="link" onClick={() => setMode("forgot")}>
              忘记密码
            </button>
          </>
        ) : mode === "signup" ? (
          <button className="link" onClick={() => setMode("signin")}>
            已有账号？去登录
          </button>
        ) : (
          <button className="link" onClick={() => setMode("signin")}>
            返回登录
          </button>
        )}
      </div>

      <p className="mut" style={{ fontSize: 12, margin: "12px 0 0" }}>
        网页端仅支持邮箱登录（不支持手机短信 / 微信登录）。注册即表示你同意社区发帖规范。
      </p>
    </Modal>
  );
}
