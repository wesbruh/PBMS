import { Link } from "react-router-dom";

// page footer with logo and copyright, should be available across all pages
  function Footer() {
    return (
      <footer className='relative w-full text-[#7E4C3C] m-3 py-1 font-serif '>
        <div className='flex justify-between items-center '>
          
          {/* left side logo and copyright */}
          <div className='flex items-center gap-3'>
            <img src="public/favicon.ico" alt="Your Roots Photography Logo" className='h-12 w-12' />
            <span className='text-[#7E4C3C] font-serif text-md'> &copy; Your Roots Photography</span>
          </div>
  
          {/* centered social media icons, working links */}
          <div className='flex gap-8 items-center absolute left-1/2 transform -translate-x-1/2'>
            <a 
              href="https://www.instagram.com/your.rootsphotography/" 
              target="_blank" 
              rel="noopener noreferrer"
              className='text-[#7E4C3C] hover:text-[#AB8C4B] transition'
              aria-label="Instagram"
            >
              <i className="fab fa-instagram text-3xl"></i>
            </a>
            
            <a 
              href="https://www.facebook.com/bailey.palestini" 
              target="_blank" 
              rel="noopener noreferrer"
              className='text-[#7E4C3C] hover:text-[#AB8C4B] transition'
              aria-label="Facebook"
            >
              <i className="fab fa-facebook text-3xl"></i>
            </a>
            
            <a 
              href="https://www.tiktok.com/@baileypalestini" 
              target="_blank" 
              rel="noopener noreferrer"
              className='text-[#7E4C3C] hover:text-[#AB8C4B] transition'
              aria-label="TikTok"
            >
              <i className="fab fa-tiktok text-3xl"></i>
            </a>
          </div>
        </div>
      </footer>
    );
  }
  
  export default Footer
