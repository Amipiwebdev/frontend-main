import React, { useEffect, useState } from "react";
import axios from "axios";
import logo from "../../assets/logo.png";

const IMG_PATH = "https://www.amipi.com/images/category_navigation_image/";

const Header = () => {
  const [menu, setMenu] = useState([]);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    axios.get("https://api.mydiamondsearch.com/api/mega-menu").then((res) => {
      setMenu(res.data || []);
    });
  }, []);

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
          <div className={colClass}>
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
        );
      case 2:
        return (
          <div className={colClass}>
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
            <li>
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
                                  {renderMenuContent(subnav, false, subColCount)}
                                  {subnav.child && (
                                    <div className="clear-both">
                                      {subnav.child.map((childnav) =>
                                        renderMenuContent(
                                          childnav,
                                          true,
                                          subnav.sub_nav_col
                                        )
                                      )}
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

            {/* Right: Login & Cart */}
            <div
              className="d-flex align-items-center gap-2 login-button position-relative list-group-item border aborder-primary rounded-pill bg-transparent"
              onClick={() => setShowCart(!showCart)}
              style={{ cursor: "pointer" }}
            >
              Welcome, Mr. Tarun K Pawar
              <button className="btn btn-outline-dark btn-sm ms-2">LOGOUT</button>
              <a
                href="/cart"
                className="btn btn-link text-dark ms-2"
                style={{ fontSize: 22 }}
              >
                <i className="fas fa-shopping-cart"></i>
              </a>
            </div>
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
          <h5 className="offcanvas-title" id="mobileMenuLabel">Menu</h5>
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
          <div className="d-flex align-items-center justify-content-between">
            <span className="small">Welcome, Mr. Tarun K Pawar</span>
            <button className="btn btn-outline-dark btn-sm">LOGOUT</button>
          </div>
          <a href="/cart" className="d-inline-flex align-items-center mt-2 text-decoration-none">
            <i className="fas fa-shopping-cart me-2" />
            Cart
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
