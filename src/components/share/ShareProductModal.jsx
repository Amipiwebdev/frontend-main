// src/components/share/ShareProductModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { api } from "../../apiClient";

/**
 * Props:
 * - open, onClose
 * - productId (number | string)
 * - optionId (number | string | null)
 * - productTitle (string)
 * - productUrl (string)
 * - productImage (string)
 * - authUser  (object | null)  -> { fullname|firstname|email }
 */

// ✅ Vite-style env var; falls back to your hardcoded key
const RECAPTCHA_SITE_KEY =
  (import.meta && import.meta.env && import.meta.env.VITE_RECAPTCHA_SITE_KEY) ||
  "6LeV_QUbAAAAAK_6V6lsV-w4hU6QquxiVC0xDgD5";

const defaultMessage =
  `Check out these items that I selected for your review. Let me know if you have any questions or any feedback on it.
I will be in touch with you to discuss further.`;

export default function ShareProductModal({
  open,
  onClose,
  productId,
  optionId = null,
  productTitle = "",
  productUrl = "",
  productImage = "",
  authUser = null,
}) {
  const [yourName, setYourName] = useState("");
  const [yourEmail, setYourEmail] = useState("");
  const [friendName, setFriendName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [markupQuestion, setMarkupQuestion] = useState(false);
  const [markup, setMarkup] = useState(0);
  const [message, setMessage] = useState(defaultMessage);
  const [webdev, setWebdev] = useState(""); // honeypot (must stay empty)
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState("");

  const recaptchaRef = useRef(null);

  // Prefill from your stored session (localStorage "amipiUser") if not passed
  const sessionUser = useMemo(() => {
    if (authUser) return authUser;
    try {
      const raw = localStorage.getItem("amipiUser");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [authUser]);

  useEffect(() => {
    if (!open) return;
    setErr("");
    setOk("");
    setMessage(defaultMessage);
    setMarkupQuestion(false);
    setMarkup(0);
    setWebdev("");

    if (sessionUser) {
      const name =
        sessionUser.fullname ||
        `${sessionUser.firstname || ""} ${sessionUser.lastname || ""}`.trim() ||
        sessionUser.company ||
        "Customer";
      setYourName(name);
      setYourEmail(sessionUser.email || "");
    } else {
      setYourName("");
      setYourEmail("");
    }

    setFriendName("");
    setFriendEmail("");

    // reset recaptcha
    if (recaptchaRef.current) {
      try {
        recaptchaRef.current.reset();
      } catch {}
    }
    setRecaptchaToken("");
  }, [open, sessionUser]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    if (busy) return;

    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      setErr("Please complete the reCAPTCHA.");
      return;
    }
    if (!yourName || !yourEmail || !friendName || !friendEmail) {
      setErr("Please fill all required fields.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        ProductYourName: yourName,
        ProductYourEmail: yourEmail,
        ProductFriendName: friendName,
        ProductFriendEmail: friendEmail,
        ProductItemsID: String(productId || ""),
        ProductOptionID: optionId ? String(optionId) : "",
        ProductMessage: message,
        markup_question: markupQuestion ? 1 : 0,
        markup: Number(markup || 0),
        product_title: productTitle,
        product_url: productUrl,
        product_image: productImage,
        webdev, // honeypot, should be ""
        recaptchaToken,
      };

      const { data } = await api.post("/product-share", payload);
      if (data?.status === "ok") {
        setOk("Shared successfully!");
        // Optionally close automatically after 1.5s
        setTimeout(() => onClose?.(), 1500);
      } else {
        setErr(data?.message || "Something went wrong.");
      }
    } catch (error) {
      setErr(error?.response?.data?.message || "Unable to share right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop fade show" style={{ zIndex: 1050,  // kill Bootstrap's global opacity so children don't fade
    opacity: 1,
    // use rgba for the dimming instead
    backgroundColor: "rgba(0,0,0,0.6)", }}>
      <div
        className="modal d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shareModalTitle"
      >
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header border-0">
              <h3 id="shareModalTitle" className="m-0 text-uppercase">Share</h3>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onClose}
              />
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body">
                {err ? <div className="alert alert-danger">{err}</div> : null}
                {ok ? <div className="alert alert-success">{ok}</div> : null}

                <div className="row g-3">
                  <div className="col-sm-6">
                    <label className="form-label">Your name <span className="text-danger">*</span></label>
                    <input
                      id="ProductYourName"
                      name="ProductYourName"
                      className="form-control"
                      value={yourName}
                      onChange={(e) => setYourName(e.target.value)}
                      autoComplete="name"
                      required
                    />
                    <input type="hidden" name="ProductItemsID" value={productId || ""} />
                    <input type="hidden" name="ProductOptionID" value={optionId || ""} />
                  </div>

                  <div className="col-sm-6">
                    <label className="form-label">Your email address <span className="text-danger">*</span></label>
                    <input
                      id="ProductYourEmail"
                      name="ProductYourEmail"
                      type="email"
                      className="form-control"
                      value={yourEmail}
                      onChange={(e) => setYourEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="col-sm-6">
                    <label className="form-label">Your friend's name <span className="text-danger">*</span></label>
                    <input
                      id="ProductFriendName"
                      name="ProductFriendName"
                      className="form-control"
                      value={friendName}
                      onChange={(e) => setFriendName(e.target.value)}
                      autoComplete="off"
                      required
                    />
                  </div>

                  <div className="col-sm-6">
                    <label className="form-label">Your friend's email <span className="text-danger">*</span></label>
                    <input
                      id="ProductFriendEmail"
                      name="ProductFriendEmail"
                      type="email"
                      className="form-control"
                      value={friendEmail}
                      onChange={(e) => setFriendEmail(e.target.value)}
                      autoComplete="off"
                      required
                    />
                  </div>

                  <div className="col-sm-6 d-flex align-items-center">
                    <div className="form-check mt-4">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="markup_question"
                        checked={markupQuestion}
                        onChange={(e) => setMarkupQuestion(e.target.checked)}
                      />
                      <label htmlFor="markup_question" className="form-check-label">
                        Send to a customer with markup on your behalf?
                      </label>
                    </div>
                  </div>

                  <div className="col-sm-6" style={{ display: markupQuestion ? "block" : "none" }}>
                    <label className="form-label">Markup %</label>
                    <input
                      id="markup"
                      name="markup"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      className="form-control"
                      value={markup}
                      onChange={(e) => setMarkup(e.target.value)}
                    />
                  </div>

                  {/* Honeypot (keep visible offscreen) */}
                  <div style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
                    <label>Do not fill this field</label>
                    <input
                      id="webdev"
                      name="webdev"
                      value={webdev}
                      onChange={(e) => setWebdev(e.target.value)}
                      autoComplete="off"
                      tabIndex={-1}
                    />
                  </div>

                  <div className="col-sm-12">
                    <label className="form-label">Personal message (optional)</label>
                    <textarea
                      id="ProductMessage"
                      name="ProductMessage"
                      className="form-control"
                      rows={5}
                      maxLength={500}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  <div className="col-sm-12">
                    {/* Only render ReCAPTCHA when we have a key to avoid runtime errors */}
                    {RECAPTCHA_SITE_KEY ? (
                      <ReCAPTCHA
                        ref={recaptchaRef}
                        sitekey={RECAPTCHA_SITE_KEY}
                        onChange={(t) => setRecaptchaToken(t || "")}
                      />
                    ) : (
                      <div className="alert alert-warning">
                        Missing <code>VITE_RECAPTCHA_SITE_KEY</code>; reCAPTCHA disabled in this build.
                      </div>
                    )}
                    <div
                      id="recaptcha_code_msg"
                      className="text-danger small mt-1"
                      style={{ display: !recaptchaToken && err ? "block" : "none" }}
                    >
                      Please verify the reCAPTCHA.
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer d-flex flex-column flex-sm-row gap-2">
                <p className="m-0 me-auto text-muted small">
                  This information will not be used for any purpose other than the sending of this email.
                </p>
                <button className="btn btn-outline-primary" type="submit" disabled={busy}>
                  {busy ? "Sharing..." : "Share Now"}
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
