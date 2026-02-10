
const initApp = () => {
    // Mobile Menu Logic
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (mobileMenuToggle && mainNav) {
        // Remove cloned element to clear previous listeners if any (not strictly necessary but safe)
        // const newToggle = mobileMenuToggle.cloneNode(true);
        // mobileMenuToggle.parentNode.replaceChild(newToggle, mobileMenuToggle);
        // const toggleToUse = newToggle;
        // actually cloning removes children event listeners too which is fine for spans?
        // But let's just add listener.
        
        mobileMenuToggle.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            mainNav.classList.toggle('active');
            
            // Animate hamburger to X
            const spans = mobileMenuToggle.querySelectorAll('span');
            if (spans.length === 3) {
                if (mainNav.classList.contains('active')) {
                    spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                    spans[1].style.opacity = '0';
                    spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
                } else {
                    spans[0].style.transform = 'none';
                    spans[1].style.opacity = '1';
                    spans[2].style.transform = 'none';
                }
            }
        };
    }

    // Close menu when clicking a link
    const navLinks = document.querySelectorAll('.main-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mainNav && mainNav.classList.contains('active')) {
                mainNav.classList.remove('active');
                if (mobileMenuToggle) {
                    const spans = mobileMenuToggle.querySelectorAll('span');
                    if (spans.length === 3) {
                        spans[0].style.transform = 'none';
                        spans[1].style.opacity = '1';
                        spans[2].style.transform = 'none';
                    }
                }
            }
        });
    });

    // Scroll Animations using Intersection Observer
    const observerOptions = {
        threshold: 0.1, // Trigger when 10% of the element is visible
        rootMargin: "0px 0px -50px 0px"
    };

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target); // Only animate once
                }
            });
        }, observerOptions);

        const animatedElements = document.querySelectorAll('.animate-on-scroll');
        animatedElements.forEach(el => observer.observe(el));
    }

    // FAQ Accordion
    const faqToggles = document.querySelectorAll('.faq-toggle');
    faqToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const faqItem = toggle.closest('.faq-item');
            const faqAnswer = faqItem.querySelector('.faq-answer');
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

            // Optional: Close others (Single open mode)
            document.querySelectorAll('.faq-item').forEach(item => {
                if (item !== faqItem && item.classList.contains('active')) {
                    item.classList.remove('active');
                    item.querySelector('.faq-toggle').setAttribute('aria-expanded', 'false');
                    item.querySelector('.faq-answer').style.maxHeight = null;
                }
            });

            // Toggle current
            faqItem.classList.toggle('active');
            toggle.setAttribute('aria-expanded', !isExpanded);

            if (faqItem.classList.contains('active')) {
                faqAnswer.style.maxHeight = faqAnswer.scrollHeight + "px";
            } else {
                faqAnswer.style.maxHeight = null;
            }
        });
    });

    // Video Grid Play Logic
    const videoItems = document.querySelectorAll('.video-item');
    videoItems.forEach(item => {
        const video = item.querySelector('video');
        const btn = item.querySelector('.play-btn');

        if (video && btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent bubbling
                
                // Pause other videos
                document.querySelectorAll('video').forEach(v => {
                    if (v !== video) {
                        v.pause();
                        v.controls = false;
                        // Show play button for paused videos
                        const otherBtn = v.closest('.video-item').querySelector('.play-btn');
                        if (otherBtn) otherBtn.style.display = 'flex';
                    }
                });

                video.play();
                video.controls = true;
                btn.style.display = 'none';
            });
            
            // Allow clicking on video to play/pause if controls are hidden?
            // Usually native controls handle it once shown.
            
            video.addEventListener('pause', () => {
                if (!video.seeking) {
                    video.controls = false;
                    btn.style.display = 'flex';
                }
            });

            video.addEventListener('ended', () => {
                video.controls = false;
                btn.style.display = 'flex';
                video.currentTime = 0;
            });
        }
    });

    // Scroll to Top Button Logic
    const scrollToTopBtn = document.getElementById("scrollToTopBtn");
    const mainHeader = document.querySelector('.main-header');

    window.addEventListener("scroll", () => {
        const scrollY = window.scrollY;

        // Scroll to Top Button
        if (scrollToTopBtn) {
            if (scrollY > 300) {
                scrollToTopBtn.classList.add("show");
            } else {
                scrollToTopBtn.classList.remove("show");
            }
        }

        // Header Shadow
        if (mainHeader) {
            if (scrollY > 10) {
                mainHeader.classList.add('scrolled');
            } else {
                mainHeader.classList.remove('scrolled');
            }
        }
    });

    if (scrollToTopBtn) {
        scrollToTopBtn.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    }
};

// Ensure initApp runs whether DOM is loading or already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
