import React from "react";

const Footer = () => {
  return (
    <footer className="bg-dark-blue mt-35 pt-20">
      <div className="width-1440">
        <div className="footer-row">
          {/* Newsletter */}
          <div
            className="newsletter row hidden-small-newsletter"
            style={{ background: "#2c3c5b" }}
          >
            <div className="hidden-lg hidden-md hidden-sm">
              <div className="d-flex">
                <div className="col-icon-left">
                  <div className="email-image">
                    <img
                      src="https://www.amipi.com/homepage/images/email.png"
                      title="AMIPI"
                      alt="AMIPI"
                    />
                  </div>
                </div>
                <div className="nes-head">
                  <h4>Subscribe to Our Newsletter</h4>
                </div>
              </div>
            </div>

            {/* <div className="col-sm-6 col-icon-left hidden-xs">
              <div className="email-image">
                <img
                  src="https://www.amipi.com/homepage/images/email.png"
                  title="AMIPI"
                  alt="AMIPI"
                />
              </div>
            </div> */}
            <div className="col-sm-6 col-icon-right" />
          </div>

          <div className="row footer-flex">
            {/* <div className="col-sm-3 col-md-3 col-lg-4 hidden-small"></div> */}

            <div className="col-sm-4 col-md-4 col-lg-4">
              <div className="widget widget-1 align-none">
                <h3>Contact Information</h3>
                <ul>
                  <li className="footer-address">
                    42 W 48th St, 15th Flr
                    <br />
                    New York, NY 10036
                  </li>
                  <li>
                    <i className="fa fa-phone" aria-hidden="true"></i> +1 (800)
                    530-2647
                    <br />
                    <i className="fa fa-phone" aria-hidden="true"></i> +1 (212)
                    354-9700
                  </li>
                  <li>
                    <a href="mailto:info@amipi.com">
                      <i className="fa fa-envelope" aria-hidden="true"></i>{" "}
                      info@amipi.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-sm-4 col-md-4 col-lg-4">
              <div className="widget widget-2">
                <ul>
                  <li className="heading-footer">
                    <h3>About</h3>
                    <h3></h3>
                  </li>
                  <li>
                    <a
                      href="https://www.amipi.com/about-us/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Why Amipi?
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.amipi.com/amipi-cares/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Amipi Cares
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.amipi.com/Testimonials/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Testimonials
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.amipi.com/Contact-Us/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Contact Us
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-sm-4 col-md-4 col-lg-4">
              <div className="widget widget-2 widget-border">
                <ul>
                  <li className="heading-footer">
                    <h3>Quick Links</h3>
                  </li>
                  <li>
                    <a
                      href="https://www.amipi.com/Privacy-Policy/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.amipi.com/terms-of-use/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Terms and Conditions
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.amipi.com/br-test/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Bracelets
                    </a>
                  </li>

                  {/* 
                  <ul>
                    <li><a href="#">Affiliate</a></li>
                    <li><a href="#">Lab Grown Diamonds</a></li>
                    <li><a href="#">Tems & Conditions</a></li>
                    <li><a href="#">Bridal</a></li>
                    <li><a href="#">Collections</a></li>
                  </ul>
                  */}
                </ul>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-12">
              <div className="widget widget-3 footer-c-logo widget-border">
                <ul style={{ textAlign: "center", width: "100%" }}>
                  {/* <li><a href="https://idexonline.com/" target="_blank" rel="noreferrer"><img alt="IDEX" src="https://amipi.com/images/footer-logo/index-f.png" title="IDEX" /></a></li> */}
                  <li>
                    <a
                      href="https://www.polygon.net/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        alt="polygon"
                        src="https://amipi.com/images/footer-logo/polygon-f.png"
                        title="polygon"
                      />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.thinkspacehq.com/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        alt="think-space"
                        className="width-auto"
                        src="https://amipi.com/images/footer-logo/think-space.png"
                        title="think-space"
                      />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.responsiblejewellery.com/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        alt="Responsible Jewellery"
                        className="width-auto custom-f-width"
                        src="https://amipi.com/images/footer-logo/jewelry-f.png"
                        title="Responsible Jewellery"
                      />
                    </a>
                  </li>
                  <li>
                    <a href="https://jewelersboard.com/" target="_blank" rel="noreferrer">
                      <img
                        alt="JBT"
                        className="width-auto"
                        src="https://amipi.com/images/footer-logo/jbt-f.png"
                        title="JBT"
                      />
                    </a>
                  </li>
                  <li>
                    <a href="#" target="_blank" rel="noreferrer">
                      <img
                        alt="Gemfind"
                        className="width-auto"
                        src="https://amipi.com/images/footer-logo/gemfind.png"
                        title="Gemfind"
                      />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.vdbapp.com/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        alt="VDB"
                        className="width-auto"
                        src="https://amipi.com/images/footer-logo/vdb.png"
                        title="VDB"
                      />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.punchmark.com/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        alt="Punchmark"
                        className="width-auto"
                        src="https://amipi.com/images/footer-logo/punchmark.png"
                        title="Punchmark"
                      />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.nyddc.com/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        alt="DOC"
                        className="width-auto"
                        src="https://amipi.com/images/footer-logo/doc-f.png"
                        title="DOC"
                      />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.rjomembers.com/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        alt="RJO"
                        className="width-auto"
                        src="https://amipi.com/images/footer-logo/rjo.png"
                        title="RJO"
                      />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.rapnet.com/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        alt="Rapnet"
                        src="https://amipi.com/images/footer-logo/rapnet-f.png"
                        title="Rapnet"
                      />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.americangemsociety.org/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        alt="RS"
                        src="https://amipi.com/images/footer-logo/rs-logo.png"
                        title="RS"
                      />
                    </a>
                  </li>
                </ul>
              </div>

              {/* <img src="https://www.amipi.com/homepage/images/footer-rapnet.png" className="img-responsive" alt="Rapnet" /> */}
            </div>
          </div>
        </div>

        <div className="copyright">
          <div className="col-sm-4 col-xs-12">
            <div>
              <p className="text-white mt-0">Copyright 2025 © AMIPI.</p>
            </div>
          </div>
          <div className="col-sm-8 col-xs-12">
            {/*
            <ul className="app-icon d-flex justify-end">
              <li className="text-white">Access entire diamond inventory on the go. Download our Mobile App.</li>
              <li className="copy-app-icon">
                <a href="https://apps.apple.com/us/app/amipi/id1515479530" target="_blank" rel="noreferrer">
                  <img src="https://www.amipi.com/homepage/images/google-play-icon.png" className="img-responsive" title="AMIPI" alt="AMIPI" />
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.amipi.app&hl=en_US" target="_blank" rel="noreferrer">
                  <img src="https://www.amipi.com/homepage/images/ios-app-store-icon.png" className="img-responsive" title="AMIPI" alt="AMIPI" />
                </a>
              </li>
            </ul>
            */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
