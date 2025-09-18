// src/components/common/Header.jsx
import React, { useEffect, useRef, useState } from "react";
import { api } from "../../apiClient";
import logo from "../../assets/logo.png";

/**
 * Mirrors the original PHP logic:
 * - main.sub_nav_col            -> how many columns in the mega dropdown
 * - subnav.display_in_col (1+)  -> which column this subnav lives in
 * - subnav.sub_nav_col (>1)     -> item is "two-up" (col-sm-6) otherwise full (col-sm-12)
 * - menu_type (1..4)            -> block layout per your cases
 */

const IMG_PATH = "https://www.amipi.com/images/category_navigation_image/";
const THUMB_BASE =
  "https://www.amipi.com/product_thumb.php?img=images/category_navigation_image/";

// ---------- Small helpers ----------
const toInt = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

const getColumnClass = (count) => {
  if (count === 1) return "col-sm-12";
  if (count === 2) return "col-sm-6";
  if (count === 3) return "col-sm-4";
  if (count === 4) return "col-sm-3";
  if (count >= 5) return "col-sm-3"; // we'll add an inline 20% fix below for exactly 5 cols
  return "col-sm-3";
};

// Get the highest "display_in_col" present among a list of items (top-level only)
const getMaxDisplayColUsed = (items = []) =>
  items.reduce((max, it) => Math.max(max, toInt(it?.display_in_col, 0)), 0);

// Group subnav items by display_in_col = 1..N, default invalid to last col
const groupByDisplayColumn = (items = [], colCount = 5) => {
  const cols = Array.from({ length: colCount }, () => []);
  items.forEach((it) => {
    let di = toInt(it?.display_in_col, 0);
    di = di >= 1 && di <= colCount ? di : colCount; // put invalid ones into the last column
    cols[di - 1].push(it);
  });
  return cols;
};

const Header = () => {
  const [menu, setMenu] = useState([]);
  const [showLogin, setShowLogin] = useState(false);

  // Auth state (persisted)
  const [authUser, setAuthUser] = useState(() => {
    try {
      const raw = localStorage.getItem("amipiUser");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Detect hover-capable device
  const [isHoverable, setIsHoverable] = useState(() => {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setIsHoverable(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);

  // Programmatic dropdown toggle (Bootstrap-like)
  const openDropdown = (liEl) => {
    if (!liEl) return;
    liEl.classList.add("show");
    const toggle = liEl.querySelector(".nav-link.dropdown-toggle");
    const menu = liEl.querySelector(".dropdown-menu");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    if (menu) menu.classList.add("show");
  };

  const closeDropdown = (liEl) => {
    if (!liEl) return;
    liEl.classList.remove("show");
    const toggle = liEl.querySelector(".nav-link.dropdown-toggle");
    const menu = liEl.querySelector(".dropdown-menu");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (menu) menu.classList.remove("show");
  };

  // Login state
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Fetch mega menu
  useEffect(() => {
    api
      .get("/mega-menu")
      .then((res) => setMenu(Array.isArray(res.data) ? res.data : []))
      .catch(() => setMenu([]));
  }, []);

  // Close login on outside click / ESC
  const popRef = useRef(null);
  useEffect(() => {
    if (!showLogin) return;
    const onDoc = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) {
        setShowLogin(false);
      }
    };
    const onEsc = (e) => e.key === "Escape" && setShowLogin(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [showLogin]);

  // ---------- Renderers that mirror PHP "cases" ----------

  /**
   * CASES 7–9 & type=4: render one menu item
   * - For type 1/2 we respect item.sub_nav_col to decide col-sm-6 vs 12.
   * - For type 3/4 we output UL and (if sub_nav_col > 1) add "two-column icon-left-title".
   */
  const renderMenuContent = (item) => {
    const itemTwoUp = toInt(item?.sub_nav_col, 1) > 1;
    const colClass = itemTwoUp ? "col-sm-6" : "col-sm-12";
    const thumb = item?.image ? `${THUMB_BASE}${item.image}&w=150&h=150` : "";

    switch (toInt(item?.menu_type, 4)) {
      // --- 1) Text with Top Image + Desc ---
      case 1:
        return (
          <div className={colClass} key={`m1-${item.id}`}>
            <div className="row">
              <a href={item.page_link}>
                {item.image ? (
                  <img
                    src={IMG_PATH + item.image}
                    className="img-responsive img-fluid"
                    title={item.alias}
                    alt={item.alias}
                  />
                ) : null}
                <p className="amipi-list-heading">{item.alias}</p>
                <span className="ruby-list-desc">{item.sub_title}</span>
              </a>
            </div>
          </div>
        );

      // --- 2) Text with Side Image + Desc ---
      case 2:
        return (
          <div className={colClass} key={`m2-${item.id}`}>
            <div className="title-left-image d-flex row">
              {item.image ? (
                <div className="col-sm-5">
                  <a href={item.page_link}>
                    <img
                      src={thumb}
                      className="img-responsive img-fluid"
                      title={item.alias}
                      alt={item.alias}
                    />
                  </a>
                </div>
              ) : null}
              <div className={item.image ? "col-sm-7" : "col-sm-12"}>
                <a href={item.page_link}>
                  <p className="amipi-list-heading">{item.alias}</p>
                </a>
                <span className="ruby-list-desc">{item.sub_title}</span>
              </div>
            </div>
          </div>
        );

      // --- 3) Text with Icon ---
      case 3: {
        const twoColClass = itemTwoUp ? "two-column icon-left-title" : "";
        return (
          <div className="col-sm-12" key={`m3-${item.id}`}>
            <ul className={twoColClass}>
              <li>
                <a href={item.page_link}>
                  {item.icon ? (
                    <span
                      className="me-2 align-middle"
                      dangerouslySetInnerHTML={{ __html: item.icon }}
                    />
                  ) : null}
                  {item.alias}
                </a>
              </li>
            </ul>
          </div>
        );
      }

      // --- 4) Plain Text ---
      default: {
        const twoColClass = itemTwoUp ? "two-column icon-left-title" : "";
        const needsTextLeft = [31, 32, 162].includes(toInt(item?.id, -1));
        return (
          <div className="col-sm-12" key={`m4-${item.id}`}>
            <div className="single-text-menu">
              <ul className={twoColClass}>
                <li className="new-li-mt">
                  <a href={item.page_link}>
                    <p className={`amipi-list-heading ${needsTextLeft ? "text-left" : ""}`}>
                      {item.alias}
                    </p>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        );
      }
    }
  };

  /**
   * Render one top-level *column* inside the mega menu:
   * - Mirrors CASE 6 by rendering only items whose display_in_col === this column index.
   * - Wraps content with a `.row` so the nested col-sm-* (types 1/2) work correctly.
   * - When colCount === 5, add inline style to make exactly 5 equal columns (20% each).
   */
  const renderDesktopColumn = (itemsInThisCol, subcolClass, mainId, colIndex, colCount) => {
    if (!itemsInThisCol?.length) return null;

    const fiveColFix =
      colCount === 5 ? { flex: "0 0 20%", maxWidth: "20%" } : undefined;

    return (
      <li
        key={`${mainId}-col-${colIndex}`}
        className={`menu-item ${subcolClass}`}
        role="presentation"
        style={fiveColFix}
      >
        <div className="column-inner">
          <div className="row">
            {itemsInThisCol.map((subnav) => (
              <React.Fragment key={subnav.id}>
                {renderMenuContent(subnav)}
                {Array.isArray(subnav.child) && subnav.child.length > 0 ? (
                  <div className="col-12 clear-both">
                    {subnav.child.map((childnav) => (
                      <div key={childnav.id}>{renderMenuContent(childnav)}</div>
                    ))}
                  </div>
                ) : null}
              </React.Fragment>
            ))}
          </div>
        </div>
      </li>
    );
  };

  // Mobile: use the same item renderer, but don’t enforce columns
  const renderMobileSection = (main) => (
    <div key={main.id}>
      <details>
        <summary>{main.alias}</summary>
        <div className="mt-2">
          <ul className="list-unstyled m-0 double-list">
            {main.child?.map((subnav) => (
              <li key={subnav.id} className="mb-2 clear-both">
                <div className="row">
                  {renderMenuContent({ ...subnav, sub_nav_col: 1 /* force full width */ })}
                </div>
                {subnav.child?.length ? (
                  <div className="mt-2 ps-3 width-f">
                    {subnav.child.map((childnav) => (
                      <div key={childnav.id} className="mb-2 two-col">
                        <div className="row">
                          {renderMenuContent({ ...childnav, sub_nav_col: 1 })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );

  // Login submit
  async function handleLogin(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const { data } = await api.post("/login", {
        login_uname: email.trim(),
        login_pass: pass,
        login_type: "login_page",
      });
      if (data?.status === "success" && data?.user) {
        localStorage.setItem("amipiUser", JSON.stringify(data.user));
        setAuthUser(data.user);
        setShowLogin(false);
        setEmail("");
        setPass("");
      } else {
        setErr(data?.message || "Login failed");
      }
    } catch (error) {
      setErr(error?.response?.data?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("amipiUser");
    setAuthUser(null);
  }

  // ---------- UI ----------
  return (
    <header className="main-header">
      <nav className="navbar navbar-expand-lg abg-secondary">
        <div className="container-fluid">
          {/* Logo */}
          <a className="navbar-brand d-flex align-items-center" href="/">
            <img src={logo} alt="Amipi Logo" style={{ height: 48 }} />
          </a>

          {/* Mobile Toggle (Bootstrap Offcanvas) */}
          <button
            className="navbar-toggler ms-auto"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#mobileMenu"
            aria-controls="mobileMenu"
            aria-label="Open menu"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Desktop Mega Menu */}
          <div className="collapse navbar-collapse d-none d-lg-block">
            <ul className="navbar-nav ms-auto me-auto mb-2 mb-lg-0">
              {menu.map((main) => {
                // ---- Determine how many columns to render ----
                // Use the max between configured sub_nav_col and the highest display_in_col used by children.
                const maxUsed = getMaxDisplayColUsed(main.child || []);
                const configured = toInt(main?.sub_nav_col, 1);
                const colCount = clamp(Math.max(configured, maxUsed), 1, 5);

                const subcolClass = getColumnClass(colCount);

                // For width tweaks (optional custom width when there are many items)
                const menucnt = Array.isArray(main.child) ? main.child.length : 0;
                const hasMany = menucnt > colCount;

                // Group items into columns per CASE 6
                const columns = groupByDisplayColumn(main.child || [], colCount);

                return (
                  <li
                    key={main.id}
                    className={`nav-item dropdown amipi-menu-mega ${main.css_class || ""}`}
                    onMouseEnter={isHoverable ? (e) => openDropdown(e.currentTarget) : undefined}
                    onMouseLeave={isHoverable ? (e) => closeDropdown(e.currentTarget) : undefined}
                  >
                    <a
                      className="nav-link dropdown-toggle"
                      href={main.page_link || "#"}
                      data-bs-toggle={isHoverable ? undefined : "dropdown"}
                      aria-expanded="false"
                    >
                      {main.alias}
                    </a>

                    <div className="dropdown-menu w-100 mt-0 border-0 shadow p-4 mega-menu-fullwidth">
                      <div className={`container ${hasMany ? "custom-menu-width" : ""}`}>
                        <ul className="row odd-even-bg">
                          {columns.map((itemsInCol, idx) =>
                            renderDesktopColumn(
                              itemsInCol,
                              subcolClass,
                              main.id,
                              idx + 1,
                              colCount
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Right side: Login/Welcome & Cart */}
            <ul className="d-flex align-items-center m-0">
              {!authUser ? (
                <li className="position-relative">
                  <button
                    type="button"
                    className="btn common-btn rounded-pill px-3"
                    onClick={() => setShowLogin((v) => !v)}
                    aria-haspopup="dialog"
                    aria-expanded={showLogin ? "true" : "false"}
                  >
                    Login
                  </button>

                  {showLogin && (
                    <div
                      ref={popRef}
                      className="h-login-form position-absolute"
                      style={{ right: 0, zIndex: 9999, minWidth: 320 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <form onSubmit={handleLogin}>
                        {err ? (
                          <div className="error-msg" style={{ color: "#b00020" }}>
                            {err}
                          </div>
                        ) : null}
                        <ul className="sub-log">
                          <li>
                            <input
                              type="email"
                              placeholder="Email ID"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              autoComplete="email"
                              maxLength={80}
                              required
                            />
                          </li>
                          <li>
                            <input
                              type="password"
                              placeholder="Password"
                              value={pass}
                              onChange={(e) => setPass(e.target.value)}
                              autoComplete="current-password"
                              required
                            />
                          </li>
                          <li className="d-flex justify-content-between form-sm-text">
                            <a
                              href="https://www.amipi.com/Create-Account/"
                              className="for-pass"
                              target="_blank"
                              rel="noreferrer"
                            >
                              New User
                            </a>
                            <a
                              href="https://www.amipi.com/Forgot-Password/"
                              className="for-pass"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Forgot Password?
                            </a>
                          </li>
                          <li>
                            <button
                              className="go btn common-btn primary-black"
                              type="submit"
                              disabled={busy}
                            >
                              {busy ? "Please wait…" : "LOGIN"}
                            </button>
                          </li>
                        </ul>
                      </form>
                    </div>
                  )}
                </li>
              ) : (
                <li className="list-group-item d-flex align-items-center gap-2">
                  <span className="small">
                    Welcome, {authUser.fullname || authUser.firstname || authUser.email || "User"}
                  </span>
                  <button
                    className="btn btn-outline-dark btn-sm ms-1 login-btn"
                    onClick={handleLogout}
                  >
                    LOGOUT{" "}
                    <svg
                      height="512pt"
                      viewBox="-64 0 512 512"
                      width="512pt"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="m336 512h-288c-26.453125 0-48-21.523438-48-48v-224c0-26.476562 21.546875-48 48-48h288c26.453125 0 48 21.523438 48 48v224c0 26.476562-21.546875 48-48 48zm-288-288c-8.8125 0-16 7.167969-16 16v224c0 8.832031 7.1875 16 16 16h288c8.8125 0 16-7.167969 16-16v-224c0-8.832031-7.1875-16-16-16zm0 0"></path>
                      <path d="m304 224c-8.832031 0-16-7.167969-16-16v-80c0-52.929688-43.070312-96-96-96s-96 43.070312-96 96v80c0 8.832031-7.167969 16-16 16s-16-7.167969-16-16v-80c0-70.59375 57.40625-128 128-128s128 57.40625 128 128v80c0 8.832031-7.167969 16-16 16zm0 0"></path>
                    </svg>
                  </button>
                </li>
              )}

              <li>
                <a href="/cart" className="btn btn-link text-dark cart-icon-head">
                  <svg
                    id="Layer_1"
                    height="22"
                    viewBox="0 0 28 28"
                    width="22"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g fill="rgb(0,0,0)">
                      <path d="m20.94 19h-8.88c-1.38 0-2.58-.94-2.91-2.27l-2.12-8.49c-.13-.53.19-1.08.73-1.21.08-.02.16-.03.24-.03h17c.55 0 1 .45 1 1 0 .08-.01.16-.03.24l-2.12 8.48c-.33 1.34-1.53 2.28-2.91 2.28zm-11.66-10 1.81 7.24c.11.45.51.76.97.76h8.88c.46 0 .86-.31.97-.76l1.81-7.24z"></path>
                      <path d="m8 9c-.46 0-.86-.31-.97-.76l-.81-3.24h-3.22c-.55 0-1-.45-1-1s.45-1 1-1h4c.46 0 .86.31.97.76l1 4c.13.53-.19 1.08-.73 1.21-.08.02-.16.03-.24.03z"></path>
                      <path d="m11 25c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"></path>
                      <path d="m22 25c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"></path>
                    </g>
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Mobile Offcanvas Menu */}
      <div
        className="offcanvas offcanvas-start"
        tabIndex="-1"
        id="mobileMenu"
        aria-labelledby="mobileMenuLabel"
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="mobileMenuLabel">
            <img src={logo} alt="Amipi Logo" style={{ height: 48 }} />
          </h5>
          <button
            type="button"
            className="text-reset"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          >
            <svg
              width="35"
              height="35"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#000000"
              strokeWidth="2"
              strokeLinecap="butt"
              strokeLinejoin="arcs"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="offcanvas-body">
          {menu.map((main) => renderMobileSection(main))}

          {!authUser ? (
            <div className="d-flex align-items-center justify-content-between mt-2">
              <button
                className="btn btn-dark btn-sm"
                onClick={() => setShowLogin(true)}
                data-bs-dismiss="offcanvas"
              >
                Login
              </button>
              <a href="/cart" className="d-inline-flex align-items-center text-decoration-none">
                <i className="fas fa-shopping-cart me-2" />
                Cart
              </a>
            </div>
          ) : (
            <div className="d-flex align-items-center justify-content-between mt-2">
              <span className="small">
                Welcome, {authUser.fullname || authUser.firstname || authUser.email}
              </span>
              <button className="btn btn-outline-dark btn-sm" onClick={handleLogout}>
                LOGOUT
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
