import React, { useEffect, useState } from "react";
import axios from "axios";

const Topbar = () => {
  const [store, setStore] = useState(null);

  useEffect(() => {
    axios.get("https://api.mydiamondsearch.com/api/store-info").then(res => {
      setStore(res.data);
    });
  }, []);

  if (!store) return null;

  return (
    <div
      className="amipi-topbar py-2 px-3 d-flex justify-content-between align-items-center"
      style={{
        background: "#2e3a59",
        color: "#fff",
        fontSize: 15,
        borderBottom: "2px solid #f9cd05"
      }}
    >
      {/* LEFT: Phone, Email */}
      <div className="d-flex align-items-center gap-3">
        {store.STORE_PHONE && (
          <span>
            <i className="fas fa-phone"></i>&nbsp;{store.STORE_PHONE}
          </span>
        )}
        {store.STORE_EMAIL && (
          <span>
            <i className="fas fa-envelope"></i>&nbsp;{store.STORE_EMAIL}
          </span>
        )}
        {/* Schedule Meeting */}
        <a
          href="/schedule-meeting"
          className="btn btn-warning py-1 px-3 ms-3"
          style={{
            background: "#f9cd05",
            color: "#223052",
            borderRadius: 20,
            fontWeight: 500,
            fontSize: 15,
            border: 0
          }}
        >
          Schedule A Virtual Meeting
        </a>
      </div>
      {/* RIGHT: Social icons and Trade Shows */}
      <div className="d-flex align-items-center gap-3">
        {/* Facebook */}
        {store.STORE_FB_LINK && (
          <a
            href={store.STORE_FB_LINK}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#fff", fontSize: 19 }}
            aria-label="Facebook"
          >
            <i className="fab fa-facebook-f"></i>
          </a>
        )}
        {/* Instagram */}
        {store.STORE_INSTAGRAM_LINK && (
          <a
            href={store.STORE_INSTAGRAM_LINK}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#fff", fontSize: 19 }}
            aria-label="Instagram"
          >
            <i className="fab fa-instagram"></i>
          </a>
        )}
        {/* LinkedIn */}
        {store.STORE_LINKEDIN_LINK && (
          <a
            href={store.STORE_LINKEDIN_LINK}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#fff", fontSize: 19 }}
            aria-label="LinkedIn"
          >
            <i className="fab fa-linkedin-in"></i>
          </a>
        )}
        {/* Trade Shows Button */}
        <a
          href="/trade-shows"
          className="btn btn-warning py-1 px-3"
          style={{
            background: "#f9cd05",
            color: "#223052",
            borderRadius: 20,
            fontWeight: 500,
            fontSize: 15,
            border: 0
          }}
        >
          Trade Shows
        </a>
      </div>
    </div>
  );
};

export default Topbar;
