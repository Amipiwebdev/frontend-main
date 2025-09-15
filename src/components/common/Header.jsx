// src/components/common/Header.jsx
import React, { useEffect, useRef, useState } from "react";
import { api } from "../../apiClient"; // <-- use the shared client
import logo from "../../assets/logo.png";

const IMG_PATH = "https://www.amipi.com/images/category_navigation_image/";

const Header = () => {
  const [menu, setMenu] = useState([]);
  const [showLogin, setShowLogin] = useState(false);

  // Auth state (persisted in localStorage)
  const [authUser, setAuthUser] = useState(() => {
    try {
      const raw = localStorage.getItem("amipiUser");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Login form state
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Fetch mega menu (no credentials)
  useEffect(() => {
    api
      .get("/mega-menu")
      .then((res) => setMenu(res.data || []))
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

  // Helpers
  const getColumnClass = (count) => {
    if (count === 1) return "col-sm-12";
    if (count === 2) return "col-sm-6";
    if (count === 3) return "col-sm-4";
    if (count >= 4) return "col-sm-3";
    return "col-sm-3";
  };

  // Renders one item exactly like desktop (images + SVG), used in both desktop and mobile
  const renderMenuContent = (item, isChild = false, subnavCount = 1) => {
    const colClass = subnavCount > 1 ? "col-sm-6" : "col-sm-12";
    const thumb = `https://www.amipi.com/product_thumb.php?img=images/category_navigation_image/${item.image}&w=150&h=150`;

    switch (item.menu_type) {
      case 1:
        return (
          <div className="col-sm-12">
            <div className="row">
                <div className="col-sm-12">
                    <a href={item.page_link}>
                      {item.image && (
                        <img
                          src={IMG_PATH + item.image}
                          className="img-fluid"
                          alt={item.alias}
                        />
                      )}
                      <h3 className="amipi-list-heading">{item.alias}</h3>
                      <span className="ruby-list-desc">{item.sub_title}</span>
                    </a>
                </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="col-sm-12">
            <div className="row title-left-image d-flex">
              {item.image && (
                <div className="col-sm-5">
                  <a href={item.page_link}>
                    <img src={thumb} className="img-fluid" alt={item.alias} />
                  </a>
                </div>
              )}
              <div className={item.image ? "col-sm-7" : "col-sm-12"}>
                <a href={item.page_link}>
                  <h3 className="amipi-list-heading">{item.alias}</h3>
                </a>
                <span className="ruby-list-desc">{item.sub_title}</span>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <ul className={subnavCount > 1 ? "two-column icon-left-title" : ""}>
            <li id={item.id}>
              <a href={item.page_link}>
                {item.icon && (
                  <span
                    className="me-2 align-middle"
                    dangerouslySetInnerHTML={{ __html: item.icon }}
                  />
                )}
                {item.alias}
              </a>
            </li>
          </ul>
        );
      case 4:
        return (
          <div className="single-text-menu">
            <ul className={subnavCount > 1 ? "two-column icon-left-title" : ""}>
              <li className="new-li-mt">
                <a href={item.page_link}>
                  <h3
                    className={`amipi-list-heading ${
                      [31, 32, 162].includes(item.id) ? "text-left" : ""
                    }`}
                  >
                    {item.alias}
                  </h3>
                </a>
              </li>
            </ul>
          </div>
        );
      default:
        return null;
    }
  };

  // Mobile: reuse the SAME renderer so images/SVGs match desktop
  const renderMobileSection = (main) => {
    const subColCount = main.sub_nav_col || 4;
    return (
      <div key={main.id} className="mb-3">
        <details>
          <summary className="py-2 fw-semibold">{main.alias}</summary>
          <div className="mt-2">
            <ul className="list-unstyled m-0">
              {main.child?.map((subnav) => {
                if (!subnav.display_in_col) return null;
                return (
                  <li key={subnav.id} className="mb-2">
                    {/* Force full-width inside offcanvas by passing subnavCount=1 */}
                    {renderMenuContent(subnav, false, 1)}
                    {subnav.child && (
                      <div className="mt-2 ps-3">
                        {subnav.child.map((childnav) => (
                          <div key={childnav.id} className="mb-2">
                            {renderMenuContent(childnav, true, 1)}
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </details>
      </div>
    );
  };

  // Submit login to your PHP (expects login_uname & login_pass)
  async function handleLogin(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const { data } = await api.post("/login", {
        login_uname: email.trim(),
        login_pass: pass,
        login_type: "login_page",
        // is_retailer and parent_retailer_id are optional in your PHP
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

  // UI
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
                const subColCount = main.sub_nav_col || 4;
                const subcolClass = getColumnClass(subColCount);
                const hasMany = main.child?.length > 4;

                return (
                  <li
                    key={main.id}
                    className="nav-item dropdown position-static amipi-menu-mega"
                  >
                    <a
                      className="nav-link dropdown-toggle"
                      href={main.page_link || "#"}
                      data-bs-toggle="dropdown"
                    >
                      {main.alias}
                    </a>
                    <div className="dropdown-menu w-100 mt-0 border-0 shadow p-4 mega-menu-fullwidth">
                      <div
                        className={`container ${
                          hasMany ? "custom-menu-width" : ""
                        }`}
                      >
                        <ul className="row odd-even-bg">
                          {main.child?.map((subnav) => {
                            if (!subnav.display_in_col) return null;
                            return (
                              <li
                                key={subnav.id}
                                className={`menu-item ${subcolClass}`}
                              >
                                <div className="column-inner">
                                  {renderMenuContent(
                                    subnav,
                                    false,
                                    subColCount
                                  )}
                                  {subnav.child && (
                                    <div className="clear-both">
                                      {subnav.child.map((childnav) => (
                                        <div key={childnav.id}>
                                          {renderMenuContent(
                                            childnav,
                                            true,
                                            subnav.sub_nav_col
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Right: Login/Welcome & Cart */}
            <ul className="d-flex align-items-center gap-3 m-0">
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
                              style={{ cursor: "pointer" }}
                            >
                              New User
                            </a>
                            <a
                              href="https://www.amipi.com/Forgot-Password/"
                              className="for-pass"
                              target="_blank"
                              rel="noreferrer"
                              style={{ cursor: "pointer" }}
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
                <li className="list-group-item border aborder-primary rounded-pill bg-transparent d-flex align-items-center gap-2 px-3">
                  <span className="small">
                    Welcome,{" "}
                    {authUser.fullname ||
                      authUser.firstname ||
                      authUser.email ||
                      "User"}
                  </span>
                  <button
                    className="btn btn-outline-dark btn-sm ms-1"
                    onClick={handleLogout}
                  >
                    LOGOUT
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

      {/* Mobile Offcanvas Menu (uses SAME renderer) */}
      <div
        className="offcanvas offcanvas-start"
        tabIndex="-1"
        id="mobileMenu"
        aria-labelledby="mobileMenuLabel"
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="mobileMenuLabel">
            Menu
          </h5>
          <button
            type="button"
            className="btn-close text-reset"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          ></button>
        </div>

        <div className="offcanvas-body">
          {menu.map((main) => renderMobileSection(main))}

          <hr />
          {!authUser ? (
            <div className="d-flex align-items-center justify-content-between">
              <button
                className="btn btn-dark btn-sm"
                onClick={() => setShowLogin(true)}
                data-bs-dismiss="offcanvas"
              >
                Login
              </button>
              <a
                href="/cart"
                className="d-inline-flex align-items-center text-decoration-none"
              >
                <i className="fas fa-shopping-cart me-2" />
                Cart
              </a>
            </div>
          ) : (
            <div className="d-flex align-items-center justify-content-between">
              <span className="small">
                Welcome,{" "}
                {authUser.fullname || authUser.firstname || authUser.email}
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
