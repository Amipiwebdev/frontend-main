import React from 'react'

const Footer = () => {
  return (
    <footer className='text-white mt-5' style={{ backgroundColor: '#2c3c5b' }}>
            <div className='container'>
                <div className='row'>
                    <div className='col-md-4'>

                        <h5>Contact Information</h5>
                        <p>Email: info@amipi.com</p>
                        <p>Phone: +1 (234) 567-890</p>
                        <p>Address: 123 Amipi Street, City, Country</p>

                    </div>
                    <div className='col-md-4'>

                        <h5>About Us</h5>
                        <p>Why Amipi?</p>
                        <p>Amipi Cares</p>
                        <p>Testimonials</p>
                        <p>Contact Us</p>

                    </div>
                    <div className='col-md-4'>

                        <h5>Quick Links</h5>
                        <p>Anniversary Bands Test</p>
                        <p>Privacy Policy</p>
                        <p>Terms of Service</p>
                        <p>Return Policy</p>
                    </div>
                </div>
                <div className='text-center py-3'>
                    <p>&copy; {new Date().getFullYear()} Amipi. All rights reserved.</p>
                </div>
            </div>
        </footer>
  )
}

export default Footer
