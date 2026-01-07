// src/components/common/Header.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, apiSession } from "../../apiClient";
import { useAuth } from "../../auth.jsx";
import logo from "../../assets/logo.png";
import smallogo from "../../assets/small-logo.png";

/**
 * FIXES DONE:
 * 1) Search field pe click/tap karte hi hide ho raha tha:
 *    - Reason: same `showSearch` state se mobile + desktop dono search-pop render ho rahe the,
 *      aur same `searchRef` 2 jagah assign ho ke outside-click handler confuse ho raha tha.
 *    - Fix: `isDesktop` detect karke sirf ek (mobile OR desktop) search UI render hota hai.
 *    - Outside click listener: pointerdown + popup pe stopPropagation.
 *
 * 2) Login popup input pe tap/click se close na ho (already handled) ƒ?" keep same.
 */

const IMG_PATH = "https://www.amipi.com/images/category_navigation_image/";
const THUMB_BASE = "https://www.amipi.com/images/category_navigation_image/";

// ---------------- helpers ----------------
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
  return "col-sm-3"; // 5 => custom 20% width used below
};

const toSlug = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "untitled";

const getMaxDisplayColUsed = (items = []) =>
  items.reduce((max, it) => Math.max(max, toInt(it?.display_in_col, 0)), 0);

const groupByDisplayColumn = (items = [], colCount = 5) => {
  const cols = Array.from({ length: colCount }, () => []);
  items.forEach((it) => {
    let di = toInt(it?.display_in_col, 0);
    di = di >= 1 && di <= colCount ? di : colCount;
    cols[di - 1].push(it);
  });
  return cols;
};

const SearchIcon = React.memo(function SearchIcon(props) {
  return (
    <svg
      fill="none"
      height="512"
      viewBox="0 0 24 24"
      width="512"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="m16.9994 16.2923 3.8542 3.8541c.1952.1953.1952.5119 0 .7072-.1953.1952-.5119.1952-.7072 0l-3.8541-3.8542c-1.4103 1.2451-3.2631 2.0006-5.2923 2.0006-4.41828 0-8-3.5817-8-8 0-4.41828 3.58172-8 8-8 4.4183 0 8 3.58172 8 8 0 2.0292-.7555 3.882-2.0006 5.2923zm-5.9994 1.7077c3.866 0 7-3.134 7-7 0-3.86599-3.134-7-7-7-3.86599 0-7 3.13401-7 7 0 3.866 3.13401 7 7 7z"
        fill="rgb(0,0,0)"
      ></path>
    </svg>
  );
});

const PhoneIcon = React.memo(function PhoneIcon(props) {
  return (
    <svg
      height="512"
      viewBox="0 0 64 64"
      width="512"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path d="m58.04248 46.769c-.04467-.05472-8.38567-7.94188-8.43908-7.99669a5.91476 5.91476 0 0 0 -8.14493.98307c-4.26864 5.35191-13.93522-4.63685-17.74558-11.07183-2.00832-4.47441.80123-6.21855 1.04051-6.436 3.34035-3.11619 2.20851-6.59227 1.09767-8.05027l-7.62841-8.67189c-4.86457-4.87439-11.12666 3.26135-11.99605 4.7643-7.29551 11.39 11.70967 31.56516 13.22064 33.17858.81736 1.00055 22.08128 22.2 33.38825 15.10869 1.4655-.78716 9.92965-6.74738 5.20698-11.80796zm-.63428 3.8335c-.39355 2.62891-4.17285 5.40723-5.5957 6.25586-10.147 6.04443-29.6748-13.5083-30.87207-14.72363-.28743-.30083-19.56216-20.47916-13.03433-30.76031.89663-1.3876 3.80288-5.0546 6.45425-5.35489a2.89625 2.89625 0 0 1 2.41406.88281l7.52491 8.5542c.19873.27 1.852 2.6958-.85254 5.27442-1.522 1.04-3.70264 4.12744-1.522 8.84668a30.031 30.031 0 0 0 2.97313 4.28221 32.34206 32.34206 0 0 0 9.29982 8.34962c4.58155 2.32569 7.74366.26123 8.83789-1.22217 2.68506-2.60644 5.04444-.87109 5.24659-.71484l8.30224 7.86621a2.91013 2.91013 0 0 1 .82375 2.46387z"></path>
    </svg>
  );
});

const UserIcon = React.memo(function UserIcon(props) {
  return (
    <svg viewBox="-42 0 512 512.001" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="m210.351562 246.632812c33.882813 0 63.21875-12.152343 87.195313-36.128906 23.96875-23.972656 36.125-53.304687 36.125-87.191406 0-33.875-12.152344-63.210938-36.128906-87.191406-23.976563-23.96875-53.3125-36.121094-87.191407-36.121094-33.886718 0-63.21875 12.152344-87.191406 36.125s-36.128906 53.308594-36.128906 87.1875c0 33.886719 12.15625 63.222656 36.128906 87.195312 23.980469 23.96875 53.316406 36.125 87.191406 36.125zm-65.972656-189.292968c18.394532-18.394532 39.972656-27.335938 65.972656-27.335938 25.996094 0 47.578126 8.941406 65.976563 27.335938 18.394531 18.398437 27.339844 39.980468 27.339844 65.972656 0 26-8.945313 47.578125-27.339844 65.976562-18.398437 18.398438-39.980469 27.339844-65.976563 27.339844-25.992187 0-47.570312-8.945312-65.972656-27.339844-18.398437-18.394531-27.34375-39.976562-27.34375-65.976562 0-25.992188 8.945313-47.574219 27.34375-65.972656zm0 0"></path>
      <path d="m426.128906 393.703125c-.691406-9.976563-2.089844-20.859375-4.148437-32.351563-2.078125-11.578124-4.753907-22.523437-7.957031-32.527343-3.3125-10.339844-7.808594-20.550781-13.375-30.335938-5.769532-10.15625-12.550782-19-20.160157-26.277343-7.957031-7.613282-17.699219-13.734376-28.964843-18.199219-11.226563-4.441407-23.667969-6.691407-36.976563-6.691407-5.226563 0-10.28125 2.144532-20.042969 8.5-6.007812 3.917969-13.035156 8.449219-20.878906 13.460938-6.707031 4.273438-15.792969 8.277344-27.015625 11.902344-10.949219 3.542968-22.066406 5.339844-33.042969 5.339844-10.96875 0-22.085937-1.796876-33.042968-5.339844-11.210938-3.621094-20.300782-7.625-26.996094-11.898438-7.769532-4.964844-14.800782-9.496094-20.898438-13.46875-9.753906-6.355468-14.808594-8.5-20.035156-8.5-13.3125 0-25.75 2.253906-36.972656 6.699219-11.257813 4.457031-21.003906 10.578125-28.96875 18.199219-7.609375 7.28125-14.390625 16.121094-20.15625 26.273437-5.558594 9.785157-10.058594 19.992188-13.371094 30.339844-3.199219 10.003906-5.875 20.945313-7.953125 32.523437-2.0625 11.476563-3.457031 22.363282-4.148437 32.363282-.679688 9.777344-1.023438 19.953125-1.023438 30.234375 0 26.726562 8.496094 48.363281 25.25 64.320312 16.546875 15.746094 38.4375 23.730469 65.066406 23.730469h246.53125c26.621094 0 48.511719-7.984375 65.0625-23.730469 16.757813-15.945312 25.253906-37.589843 25.253906-64.324219-.003906-10.316406-.351562-20.492187-1.035156-30.242187zm-44.90625 72.828125c-10.933594 10.40625-25.449218 15.464844-44.378906 15.464844h-246.527344c-18.933594 0-33.449218-5.058594-44.378906-15.460938-10.722656-10.207031-15.933594-24.140625-15.933594-42.585937 0-9.59375.316406-19.066407.949219-28.160157.617187-8.921874 1.878906-18.722656 3.75-29.136718 1.847656-10.285156 4.199219-19.9375 6.996094-28.675782 2.683593-8.378906 6.34375-16.675781 10.882812-24.667968 4.332031-7.617188 9.316407-14.152344 14.816407-19.417969 5.144531-4.925781 11.628906-8.957031 19.269531-11.980469 7.066406-2.796875 15.007812-4.328125 23.628906-4.558594 1.050781.558594 2.921875 1.625 5.953125 3.601563 6.167969 4.019531 13.277344 8.605469 21.136719 13.625 8.859375 5.648437 20.273437 10.75 33.910156 15.152344 13.941406 4.507812 28.160156 6.796875 42.273437 6.796875 14.113282 0 28.335938-2.289063 42.269532-6.792969 13.648437-4.410156 25.058594-9.507813 33.929687-15.164063 8.042969-5.140624 14.953125-9.59375 21.121094-13.617187 3.03125-1.972656 4.902344-3.042969 5.953125-3.601563 8.625.230469 16.566406 1.761719 23.636719 4.558594 7.636719 3.023438 14.121093 7.058594 19.265625 11.980469 5.5 5.261719 10.484375 11.796875 14.816406 19.421875 4.542969 7.988281 8.207031 16.289062 10.886719 24.660156 2.800781 8.75 5.15625 18.398438 7 28.675782 1.867187 10.433593 3.132812 20.238281 3.75 29.144531v.007812c.636719 9.058594.957031 18.527344.960937 28.148438-.003906 18.449219-5.214844 32.378906-15.9375 42.582031zm0 0"></path>
    </svg>
  );
});

const CartIcon = React.memo(function CartIcon(props) {
  return (
    <svg height="512pt" viewBox="0 -31 512.00026 512" width="512pt" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="m164.960938 300.003906h.023437c.019531 0 .039063-.003906.058594-.003906h271.957031c6.695312 0 12.582031-4.441406 14.421875-10.878906l60-210c1.292969-4.527344.386719-9.394532-2.445313-13.152344-2.835937-3.757812-7.269531-5.96875-11.976562-5.96875h-366.632812l-10.722657-48.253906c-1.527343-6.863282-7.613281-11.746094-14.644531-11.746094h-90c-8.285156 0-15 6.714844-15 15s6.714844 15 15 15h77.96875c1.898438 8.550781 51.3125 230.917969 54.15625 243.710938-15.941406 6.929687-27.125 22.824218-27.125 41.289062 0 24.8125 20.1875 45 45 45h272c8.285156 0 15-6.714844 15-15s-6.714844-15-15-15h-272c-8.269531 0-15-6.730469-15-15 0-8.257812 6.707031-14.976562 14.960938-14.996094zm312.152343-210.003906-51.429687 180h-248.652344l-40-180zm0 0"></path>
      <path d="m150 405c0 24.8125 20.1875 45 45 45s45-20.1875 45-45-20.1875-45-45-45-45 20.1875-45 45zm45-15c8.269531 0 15 6.730469 15 15s-6.730469 15-15 15-15-6.730469-15-15 6.730469-15 15-15zm0 0"></path>
      <path d="m362 405c0 24.8125 20.1875 45 45 45s45-20.1875 45-45-20.1875-45-45-45-45 20.1875-45 45zm45-15c8.269531 0 15 6.730469 15 15s-6.730469 15-15 15-15-6.730469-15-15 6.730469-15 15-15zm0 0"></path>
    </svg>
  );
});

const Header = React.memo(function Header() {
  // -------------- menu state --------------
  const [menu, setMenu] = useState([]);
  useEffect(() => {
    api
      .get("/mega-menu")
      .then((res) => setMenu(Array.isArray(res.data) ? res.data : []))
      .catch(() => setMenu([]));
  }, []);

  // -------------- responsive state --------------
  // Bootstrap lg breakpoint ƒ%^ 992px
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
    return window.matchMedia("(min-width: 992px)").matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(min-width: 992px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener ? mq.addEventListener("change", update) : mq.addListener(update);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", update) : mq.removeListener(update);
    };
  }, []);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchRef = useRef(null);

  // -------------- auth state --------------
  const { user: authUser, refresh, logout, setUserFromLogin } = useAuth();

  // -------------- UI behavior --------------
  const [showLogin, setShowLogin] = useState(false);
  const popRef = useRef(null);

  const [isHoverable, setIsHoverable] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setIsHoverable(mq.matches);
    update();
    mq.addEventListener ? mq.addEventListener("change", update) : mq.addListener(update);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", update) : mq.removeListener(update);
    };
  }, []);

  const openDropdown = useCallback((liEl) => {
    if (!liEl) return;
    liEl.classList.add("show");
    const toggle = liEl.querySelector(".nav-link.dropdown-toggle");
    const menuEl = liEl.querySelector(".dropdown-menu");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    if (menuEl) menuEl.classList.add("show");
  }, []);

  const closeDropdown = useCallback((liEl) => {
    if (!liEl) return;
    liEl.classList.remove("show");
    const toggle = liEl.querySelector(".nav-link.dropdown-toggle");
    const menuEl = liEl.querySelector(".dropdown-menu");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (menuEl) menuEl.classList.remove("show");
  }, []);

  // ƒo. Login popup close on outside click + ESC
  useEffect(() => {
    if (!showLogin) return;

    const onDoc = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) {
        setShowLogin(false);
      }
    };
    const onEsc = (e) => e.key === "Escape" && setShowLogin(false);

    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onEsc);

    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [showLogin]);

  // ƒo. Search close on outside click + ESC
  useEffect(() => {
    if (!showSearch) return;

    const onDoc = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
    };
    const onEsc = (e) => e.key === "Escape" && setShowSearch(false);

    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onEsc);

    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [showSearch]);

  // Search submit
  const handleSearchSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const q = searchTerm.trim();
      if (!q) return;
      window.location.href = `https://www.amipi.com/Search?query=${encodeURIComponent(q)}`;
    },
    [searchTerm]
  );

  // login form
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const { data } = await apiSession.post(
        "/api/login",
        {
          login_uname: email.trim(),
          login_pass: pass,
          login_type: "login_page",
        },
        {
          headers: { Accept: "application/json" },
          withCredentials: true,
        }
      );

      if (data?.status === "success" && data?.user) {
        setShowLogin(false);
        setEmail("");
        setPass("");
        setUserFromLogin(data.user);
        await refresh();
      } else {
        setErr(data?.message || "Login failed");
      }
    } catch (ex) {
      setErr(ex?.response?.data?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  // ---------------- render helpers ----------------
  const renderMenuContent = (item) => {
    const itemTwoUp = toInt(item?.sub_nav_col, 1) > 1;
    const colClass = itemTwoUp ? "col-sm-6" : "col-sm-12";
    const thumb = item?.image ? `${THUMB_BASE}${item.image}` : "";

    switch (toInt(item?.menu_type, 4)) {
      case 1:
        return (
          <div className={colClass} key={`m1-${item.id}`}>
            <div className="title-below-image">
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

  const renderDesktopColumn = (itemsInCol, subcolClass, mainId, colIndex, colCount) => {
    if (!itemsInCol?.length) return null;
    const fiveColFix = colCount === 5 ? { flex: "0 0 20%", maxWidth: "20%" } : undefined;

    return (
      <li
        key={`${mainId}-col-${colIndex}`}
        className={`menu-item ${subcolClass}`}
        role="presentation"
        style={fiveColFix}
      >
        <div className="column-inner">
          <div className="row">
            {itemsInCol.map((subnav) => (
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

  // -------- icons --------
  const stopAll = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const toggleLogin = useCallback((e) => {
    e?.stopPropagation?.();
    setShowLogin((v) => !v);
  }, []);

  const toggleSearch = useCallback((e) => {
    e?.stopPropagation?.();
    setShowSearch((v) => !v);
  }, []);

  const handleMouseEnter = useCallback(
    (e) => {
      if (!isHoverable) return;
      openDropdown(e.currentTarget);
    },
    [isHoverable, openDropdown]
  );

  const handleMouseLeave = useCallback(
    (e) => {
      if (!isHoverable) return;
      closeDropdown(e.currentTarget);
    },
    [isHoverable, closeDropdown]
  );

  const columnsMemo = useMemo(() => {
    return menu.map((main) => {
      const maxUsed = getMaxDisplayColUsed(main.child || []);
      const configured = toInt(main?.sub_nav_col, 1);
      const colCount = clamp(Math.max(configured, maxUsed), 1, 5);
      const subcolClass = getColumnClass(colCount);
      const menucnt = Array.isArray(main.child) ? main.child.length : 0;
      const hasMany = menucnt > colCount;
      const columns = groupByDisplayColumn(main.child || [], colCount);
      const isFineJewelry = /fine jewelry/i.test(main?.alias || "");
      const isDiamonds = /diamonds/i.test(main?.alias || "");
      return { main, colCount, subcolClass, hasMany, columns, isFineJewelry, isDiamonds };
    });
  }, [menu]);

  return (
    <header className="main-header">
      <nav className="navbar navbar-expand-lg abg-secondary p-0">
        <div className="container-fluid">
          {/* MOBILE: hamburger */}
          <button
            className="navbar-toggler d-lg-none"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#mobileMenu"
            aria-controls="mobileMenu"
            aria-label="Open menu"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <a className="navbar-brand d-flex align-items-center mx-2 mx-lg-0" href="https://www.amipi.com/">
            <img src={logo} alt="Amipi Logo" style={{ height: 48 }} className="d-none d-lg-inline-block" />
            <img src={smallogo} alt="Amipi Logo" style={{ height: 40 }} className="d-inline-block d-lg-none" />
          </a>

          {/* ƒo. MOBILE ICONS ƒ?" only render when !isDesktop (so searchRef never duplicates) */}
          {!isDesktop && (
            <ul className="d-lg-none head-icon-list mb-0 ms-auto">
              {/* Search */}
              <li className="position-relative">
                <button
                  type="button"
                  className="head-icon-btn"
                  title="Search"
                  aria-label="Search"
                  aria-haspopup="dialog"
                  aria-expanded={showSearch ? "true" : "false"}
                  onPointerDown={stopAll}
                  onClick={toggleSearch}
                >
                  <SearchIcon />
                </button>

                {showSearch && (
                  <div
                    ref={searchRef}
                    className="search-pop"
                    onPointerDown={stopAll}
                    onMouseDown={stopAll}
                    onTouchStart={stopAll}
                    onClick={stopAll}
                  >
                    <form onSubmit={handleSearchSubmit} className="search-form">
                      <input
                        type="text"
                        className="form-control search-input"
                        placeholder="Search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="btn go-btn">
                        GO!
                      </button>
                    </form>
                  </div>
                )}
              </li>

              {/* Phone */}
              <li>
                <a href="tel:+1" className="head-icon-btn" title="Call" aria-label="Call">
                  <PhoneIcon />
                </a>
              </li>

              {/* Cart */}
              <li>
                <a href="https://www.amipi.com/My-Cart/" className="head-icon-btn" title="Cart" aria-label="Cart">
                  <CartIcon />
                </a>
              </li>

              {/* User/Login */}
              <li className="position-relative">
                {!authUser ? (
                  <button
                    type="button"
                    className="head-icon-btn"
                    title="Login"
                    aria-label="Login"
                    aria-haspopup="dialog"
                    aria-expanded={showLogin ? "true" : "false"}
                    onPointerDown={stopAll}
                    onClick={toggleLogin}
                  >
                    <UserIcon />
                  </button>
                ) : (
                  <button type="button" className="head-icon-btn" title="Account" aria-label="Account" onClick={logout}>
                    <UserIcon />
                  </button>
                )}

                {!authUser && showLogin && (
                  <div
                    ref={popRef}
                    className="h-login-form position-absolute"
                    style={{ right: 0, zIndex: 9999, minWidth: 320 }}
                    onPointerDown={stopAll}
                    onMouseDown={stopAll}
                    onTouchStart={stopAll}
                    onClick={stopAll}
                  >
                    <form onSubmit={handleLogin}>
                      {err ? <div className="error-msg" style={{ color: "#b00020" }}>{err}</div> : null}
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
                          <a href="https://www.amipi.com/Create-Account/" className="for-pass" target="_blank" rel="noreferrer">
                            New User
                          </a>
                          <a href="https://www.amipi.com/Forgot-Password/" className="for-pass" target="_blank" rel="noreferrer">
                            Forgot Password?
                          </a>
                        </li>
                        <li>
                          <button className="go btn common-btn primary-black" type="submit" disabled={busy}>
                            {busy ? "Please waitƒ?Ý" : "LOGIN"}
                          </button>
                        </li>
                      </ul>
                    </form>
                  </div>
                )}
              </li>
            </ul>
          )}

          {/* ƒo. DESKTOP NAV ƒ?" only render when isDesktop */}
          {isDesktop && (
            <div className="collapse navbar-collapse d-none d-lg-block">
              <ul className="navbar-nav ms-auto me-auto mb-2 mb-lg-0">
                {columnsMemo.map(({ main, colCount, subcolClass, hasMany, columns, isFineJewelry, isDiamonds }) => (
                  <li
                    key={main.id}
                    className={`nav-item dropdown amipi-menu-mega ${main.css_class || ""}`}
                    onMouseEnter={isHoverable ? handleMouseEnter : undefined}
                    onMouseLeave={isHoverable ? handleMouseLeave : undefined}
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
                      <div
                        className={`container ${hasMany ? "custom-menu-width" : ""} ${
                          isFineJewelry ? "custom-lg-width" : ""
                        } ${isDiamonds ? "diamonds-menu" : ""}`}
                      >
                        <ul className="row odd-even-bg">
                          {columns.map((itemsInCol, idx) =>
                            renderDesktopColumn(itemsInCol, subcolClass, main.id, idx + 1, colCount)
                          )}
                        </ul>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Right side: Search + Auth + Cart */}
              <ul className="d-flex align-items-center m-0 gap-2">
                <li className="circle-search position-relative">
                  <button
                    type="button"
                    className="search-toggle d-inline-flex align-items-center justify-content-center"
                    title="Search"
                    aria-haspopup="dialog"
                    aria-expanded={showSearch ? "true" : "false"}
                    onPointerDown={stopAll}
                    onClick={toggleSearch}
                  >
                    <svg height="20" viewBox="0 0 461.516 461.516" width="20" xmlns="http://www.w3.org/2000/svg">
                      <path d="m185.746 371.332c41.251.001 81.322-13.762 113.866-39.11l122.778 122.778c9.172 8.858 23.787 8.604 32.645-.568 8.641-8.947 8.641-23.131 0-32.077l-122.778-122.778c62.899-80.968 48.252-197.595-32.716-260.494s-197.594-48.252-260.493 32.716-48.252 197.595 32.716 260.494c32.597 25.323 72.704 39.06 113.982 39.039zm-98.651-284.273c54.484-54.485 142.82-54.486 197.305-.002s54.486 142.82.002 197.305-142.82 54.486-197.305.002c-.001-.001-.001-.001-.002-.002-54.484-54.087-54.805-142.101-.718-196.585.239-.24.478-.479.718-.718z"></path>
                    </svg>
                    <span className="visually-hidden">Search</span>
                  </button>

                  {showSearch && (
                    <div
                      ref={searchRef}
                      className="search-pop"
                      onPointerDown={stopAll}
                      onMouseDown={stopAll}
                      onTouchStart={stopAll}
                      onClick={stopAll}
                    >
                      <form onSubmit={handleSearchSubmit} className="search-form">
                        <input
                          type="text"
                          className="form-control search-input"
                          placeholder="Search"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          autoFocus
                        />
                        <button type="submit" className="btn go-btn">
                          GO!
                        </button>
                      </form>
                    </div>
                  )}
                </li>

                {!authUser ? (
                  <li className="position-relative">
                    <button
                      type="button"
                      className="btn btn-outline-dark btn-sm ms-1 login-btn"
                      aria-haspopup="dialog"
                      aria-expanded={showLogin ? "true" : "false"}
                      onPointerDown={stopAll}
                      onClick={toggleLogin}
                    >
                      Login
                      <svg height="512pt" viewBox="-64 0 512 512" width="512pt" xmlns="http://www.w3.org/2000/svg">
                        <path d="m336 512h-288c-26.453125 0-48-21.523438-48-48v-224c0-26.476562 21.546875-48 48-48h288c26.453125 0 48 21.523438 48 48v224c0 26.476562-21.546875 48-48 48zm-288-288c-8.8125 0-16 7.167969-16 16v224c0 8.832031 7.1875 16 16 16h288c8.8125 0 16-7.167969 16-16v-224c0-8.832031-7.1875-16-16-16zm0 0"></path>
                        <path d="m304 224c-8.832031 0-16-7.167969-16-16v-80c0-52.929688-43.070312-96-96-96s-96 43.070312-96 96v80c0 8.832031-7.167969 16-16 16s-16-7.167969-16-16v-80c0-70.59375 57.40625-128 128-128s128 57.40625 128 128v80c0 8.832031-7.167969 16-16 16zm0 0"></path>
                      </svg>
                    </button>

                    {showLogin && (
                      <div
                        ref={popRef}
                        className="h-login-form position-absolute"
                        style={{ right: 0, zIndex: 9999, minWidth: 320 }}
                        onPointerDown={stopAll}
                        onMouseDown={stopAll}
                        onTouchStart={stopAll}
                        onClick={stopAll}
                      >
                        <form onSubmit={handleLogin}>
                          {err ? <div className="error-msg" style={{ color: "#b00020" }}>{err}</div> : null}
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
                              <a href="https://www.amipi.com/Create-Account/" className="for-pass" target="_blank" rel="noreferrer">
                                New User
                              </a>
                              <a href="https://www.amipi.com/Forgot-Password/" className="for-pass" target="_blank" rel="noreferrer">
                                Forgot Password?
                              </a>
                            </li>
                            <li>
                              <button className="go btn common-btn primary-black" type="submit" disabled={busy}>
                                {busy ? "Please waitƒ?Ý" : "LOGIN"}
                              </button>
                            </li>
                          </ul>
                        </form>
                      </div>
                    )}
                  </li>
                ) : (
                  <li className="list-group-item d-flex align-items-center">
                    <span className="small">
                      Welcome, {authUser.retailer_name || authUser.firstname || authUser.email || "User"}
                    </span>
                    <button className="btn btn-outline-dark btn-sm ms-1 login-btn" onClick={logout}>
                      LOGOUT
                    </button>
                  </li>
                )}

                <li>
                  <a href="https://www.amipi.com/My-Cart/" className="cart-icon-head">
                    <svg id="Layer_1" height="22" viewBox="0 0 28 28" width="22" xmlns="http://www.w3.org/2000/svg">
                      <g fill="rgb(0,0,0)">
                        <path d="m20.94 19h-8.88c-1.38 0-2.58-.94-2.91-2.27l-2.12-8.49c-.13-.53.19-1.08.73-1.21.08-.02.16-.03.24-.03h17c.55 0 1 .45 1 1 0 .08-.01.16-.03.24l-2.12 8.48c-.33 1.34-1.53 2.28-2.91 2.28zm-11.66-10 1.81 7.24c.11.45.51.76.97.76h8.88c.46 0 .86-.31.97-.76l1.81-7.24z"></path>
                        <path d="m8 9c-.46 0-.86-.31-.97-.76l-.81-3.24h-3.22c-.55 0-1-.45-1-1s.45-1 1-1h4c.46 0 .86.31.97.76l1 4c.13-.53-.19 1.08-.73 1.21-.08.02-.16.03-.24.03z"></path>
                        <path d="m11 25c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"></path>
                        <path d="m22 25c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"></path>
                      </g>
                    </svg>
                  </a>
                </li>

                <li>
  <a href="https://www.amipi.com/My-Wishlist/" className="wishlist-icon-head">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="rgb(0,0,0)"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
        2 5.42 4.42 3 7.5 3
        c1.74 0 3.41.81 4.5 2.09
        C13.09 3.81 14.76 3 16.5 3
        19.58 3 22 5.42 22 8.5
        c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  </a>
</li>

              </ul>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Offcanvas Menu */}
      <div className="offcanvas offcanvas-start" tabIndex="-1" id="mobileMenu" aria-labelledby="mobileMenuLabel">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="mobileMenuLabel">
            <img src={smallogo} alt="Amipi Logo" style={{ height: 48 }} />
          </h5>
          <button type="button" className="text-reset" data-bs-dismiss="offcanvas" aria-label="Close">
            <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="arcs">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="offcanvas-body">
          {menu.map((main) => (
            <div key={main.id}>
              <details className={`mobile-section ${toSlug(main?.alias)}`}>
                <summary>{main.alias}</summary>
                <div className="mt-2">
                  <ul className="list-unstyled m-0 double-list">
                    {main.child?.map((subnav) => (
                      <li key={subnav.id} className="mb-2 clear-both">
                        <div className="row">{renderMenuContent({ ...subnav, sub_nav_col: 1 })}</div>
                        {subnav.child?.length ? (
                          <div className="mt-2 ps-3 width-f row">
                            {subnav.child.map((childnav) => (
                              <div key={childnav.id} className="mb-2 two-col">
                                <div className="row">{renderMenuContent({ ...childnav, sub_nav_col: 1 })}</div>
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
          ))}
        </div>
      </div>
    </header>
  );
});

export default Header;
