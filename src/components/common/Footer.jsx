import React from "react";

export default React.memo(function Footer() {
  return (
    <footer className="bg-dark-blue mt-35 pt-20">
      <div className="width-1440">
        <div className="footer-row">
          {/* Newsletter */}
          <div className="newsletter row hidden-small-newsletter">
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

      <div className="col-md-6 col-icon-left hidden-xs">
        <div className="email-image">
          <img
            src="https://www.amipi.com/homepage/images/email.png"
            title="AMIPI"
            alt="AMIPI"
          />
        </div>
      </div>

      <div className="col-md-6 col-icon-right">
        {/* Local styles for this block */}
        <style>{`
          #mc_embed_signup .mc-field-group{margin: 0 !important}
          #mc_embed_signup h4 {
            color: #2c3b5b;
            margin-bottom: 10px;
          }
          #mc_embed_signup h3 { margin: 10px 0; }
          .asterisk{color: red}
          ul.diamond-list {
            display: flex; list-style: none; padding-left: 0;
            margin: 0 0 10px 0;
          }
          ul.diamond-list li { margin-right: 15px; }
          input#mc-embedded-subscribe {
            background: #2c3b5b 0 !important;
            border: 0 !important;
            padding: 2px 24px !important;
            color: #fed700 !important;
            text-transform: uppercase !important;
            font-weight: bold !important;
          }
          input#mce-EMAIL {
            border: 1px solid #CCC;
            padding: 4px 10px;
            border-radius: 5px;
          }
          .input-email{display: block;}
          input#mce-EMAIL{width: 100%;}
          .mc-field-group { margin: 12px 0; }
          input#mce-MMERGE3-0 { height: auto !important; }
          #mc_embed_signup .mc-field-group input {
            display: block; width: 100%;
            padding: 8px 0; text-indent: 2%;
            background: none; border:1px solid #2C3C5B;
            border-radius: 10px; height: 50px;
          }
          #mc_embed_signup .button{
            background: #2C3C5B 0 !important;
            border-radius: 25px 25px 0 25px !important;
            width: 200px !important; font-size: 18px !important;
            margin: 10px 0 !important; padding: 10px !important;
            display: block; line-height: initial !important;
            height: auto !important; color: #FFF !important;
            font-weight: normal !important; text-transform: inherit !important;
          }
          #mc_embed_signup{ clear:left; font:14px Helvetica,Arial,sans-serif; }
        `}</style>

        {/* Mailchimp form */}
        <div id="mc_embed_signup" className="footer-form">
          <form
            action="https://amipi.us19.list-manage.com/subscribe/post?u=91f57d397080494a0a49ccc7f&amp;id=25483f5eb3"
            method="post"
            id="mc-embedded-subscribe-form"
            name="mc-embedded-subscribe-form"
            className="validate"
            target="_blank"
            rel="noreferrer"
            noValidate
          >
            <div id="mc_embed_signup_scroll">
              <h4 className="hidden-xs">Subscribe to Our Newsletter</h4>

              <div className="mc-field-group">
                <label htmlFor="mce-EMAIL">
                  Email Address <span className="asterisk">*</span>
                </label>
                <input
                  type="email"
                  name="EMAIL"
                  className="required email"
                  id="mce-EMAIL"
                  aria-required="true"
                  required
                />
              </div>

              <div className="mc-field-group">
                <label htmlFor="mce-COMPANY">
                  Company <span className="asterisk">*</span>
                </label>
                <input
                  type="text"
                  name="COMPANY"
                  className="required"
                  id="mce-COMPANY"
                  aria-required="true"
                  required
                />
              </div>

              {/* Hidden tags field */}
              <div className="mc-field-group" style={{ display: "none" }}>
                <input type="hidden" name="tags" value="6249660" />
              </div>

              {/* Responses */}
              <div id="mce-responses" className="clear">
                <div className="response" id="mce-error-response" style={{ display: "none" }} />
                <div className="response" id="mce-success-response" style={{ display: "none" }} />
              </div>

              {/* Honeypot */}
              <div style={{ position: "absolute", left: "-5000px" }} aria-hidden="true">
                <input
                  type="text"
                  name="b_91f57d397080494a0a49ccc7f_25483f5eb3"
                  tabIndex={-1}
                  defaultValue=""
                />
              </div>

              <div className="clear">
                <input
                  type="submit"
                  value="Subscribe"
                  name="subscribe"
                  id="mc-embedded-subscribe"
                  className="button"
                />
              </div>
            </div>

            <small>
              Your email will be managed in accordance with our{" "}
              <a href="https://www.amipi.com/Privacy-Policy/" target="_blank" rel="noreferrer">
                privacy policy
              </a>{" "}
              which you can view here. Unsubscribe at any time.
            </small>
          </form>
        </div>
      </div>
    </div>  

          <div className="row footer-flex m-0">
            <div className="col-sm-3 col-md-3 col-lg-4 col-xl-3 hidden-small">
      {/* Scoped styles for this widget */}
      <style>{`
        #mc_embed_signup .mc-field-group{margin: 0 !important}
        #mc_embed_signup .form-hidden h2 {
          color: #FFF;
          margin-bottom: 10px;
        }
        #mc_embed_signup .form-hidden h3 { margin: 10px 0; }
        .asterisk{color: red}
        ul.diamond-list {
          display: flex; list-style: none; padding-left: 0;
          margin: 0 0 10px 0;
        }
        ul.diamond-list li { margin-right: 15px; }
        input#mc-embedded-subscribe {
          background: #2c3b5b !important;
          border: 0 !important;
          padding: 2px 24px !important;
          color: #fed700 !important;
          text-transform: uppercase !important;
          font-weight: bold !important;
        }
        input#mce-EMAIL {
          border: 1px solid #CCC;
          padding: 4px 10px;
          border-radius: 5px;
        }
        #mc_embed_signup .form-hidden .mc-field-group label { color: #FFF; }
        .input-email{display: block;}
        input#mce-EMAIL{width: 100%;}
        .mc-field-group { margin: 12px 0; }
        #mc_embed_signup .form-hidden .mc-field-group input {
          display: block; width: 100%;
          padding: 8px 0; text-indent: 2%;
          background: #FFF; border-color: #2C3C5B;
          border-radius: 10px; height: 50px;
        }
        #mc_embed_signup .form-hidden .button {
          background: #fed700 !important;
          color: #2c3b5c !important;
        }
        #mc_embed_signup{ clear: left; font: 14px Helvetica, Arial, sans-serif; }
      `}</style>

      <div id="mc_embed_signup" className="widget">
        <form
          action="https://amipi.us19.list-manage.com/subscribe/post?u=91f57d397080494a0a49ccc7f&amp;id=25483f5eb3"
          method="post"
          id="mc-embedded-subscribe-form"
          name="mc-embedded-subscribe-form"
          className="validate form-hidden"
          target="_blank"
          rel="noreferrer"
          noValidate
        >
          <div id="mc_embed_signup_scroll">
            <h4>Subscribe to Our Newsletter</h4>

            <div className="mc-field-group">
              <label htmlFor="mce-EMAIL">
                Email Address <span className="asterisk">*</span>
              </label>
              <input
                type="email"
                name="EMAIL"
                className="required email"
                id="mce-EMAIL"
                required
              />
            </div>

            <div className="mc-field-group">
              <label htmlFor="mce-COMPANY">
                Company <span className="asterisk">*</span>
              </label>
              <input
                type="text"
                name="COMPANY"
                className="required"
                id="mce-COMPANY"
                required
              />
            </div>

            {/* Hidden tags field */}
            <div className="mc-field-group" style={{ display: "none" }}>
              <input type="hidden" name="tags" value="6249660" />
            </div>

            {/* Response containers (Mailchimp will control these on redirect) */}
            <div id="mce-responses" className="clear">
              <div className="response" id="mce-error-response" style={{ display: "none" }} />
              <div className="response" id="mce-success-response" style={{ display: "none" }} />
            </div>

            {/* Honeypot */}
            <div style={{ position: "absolute", left: "-5000px" }} aria-hidden="true">
              <input
                type="text"
                name="b_91f57d397080494a0a49ccc7f_25483f5eb3"
                tabIndex={-1}
                defaultValue=""
              />
            </div>

            <div className="clear">
              <input
                type="submit"
                value="Subscribe"
                name="subscribe"
                id="mc-embedded-subscribe"
                className="button"
              />
            </div>

            <small className="text-white">
              Your email will be managed in accordance with our{" "}
              <a href="https://www.amipi.com/Privacy-Policy/" target="_blank" rel="noreferrer">
                privacy policy
              </a>{" "}
              which you can view here. Unsubscribe at any time.
            </small>
          </div>
        </form>
      </div>
    </div>

            <div className="col-sm-4 col-md-4 col-lg-4 col-xl-3">
              <div className="widget widget-1 align-none">
                <h3>Contact Information</h3>
                <ul>
                  <li className="footer-address">
                    42 W 48th St, 15th Flr New York, NY 10036
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

            <div className="col-sm-4 col-md-4 col-lg-4 col-xl-3">
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

            <div className="col-sm-4 col-md-4 col-lg-4 col-xl-3">
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

          <div className="row  m-0">
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
              <p className="text-white mt-0">Copyright 2025 Ac AMIPI.</p>
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
});
