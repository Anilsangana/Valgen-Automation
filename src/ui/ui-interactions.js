/**
 * Premium UI Interactions & Animations Core
 * Adds micro-interactions, tooltips, toasts, and smooth transitions
 */

document.addEventListener('DOMContentLoaded', () => {

    // 1. Tooltips Initialization
    const initTooltips = () => {
        // Find elements that could use tooltips and add data-tooltip
        document.querySelectorAll('.compliance-badge').forEach(el => {
            if (!el.hasAttribute('data-tooltip')) {
                el.setAttribute('data-tooltip', 'Verified & Compliant Structure');
            }
        });

        document.querySelectorAll('.status-pill').forEach(el => {
             if (!el.hasAttribute('data-tooltip')) {
                el.setAttribute('data-tooltip', 'Services are running smoothly');
             }
        });
    };

    // 2. Ripple Effect for Buttons
    const initRipples = () => {
        const buttons = document.querySelectorAll('button:not(:disabled)');
        buttons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                // Remove older ripples
                const oldRipple = this.querySelector('.ripple-effect');
                if (oldRipple) oldRipple.remove();

                const ripple = document.createElement('span');
                ripple.classList.add('ripple-effect');

                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;

                ripple.style.width = ripple.style.height = `${size}px`;
                ripple.style.left = `${x}px`;
                ripple.style.top = `${y}px`;
                ripple.style.position = 'absolute';
                ripple.style.background = 'rgba(255,255,255,0.3)';
                ripple.style.borderRadius = '50%';
                ripple.style.pointerEvents = 'none';
                ripple.style.transform = 'scale(0)';
                ripple.style.animation = 'ripple-anim 600ms linear';
                
                // Add keyframes if not present
                if (!document.getElementById('ripple-keyframes')) {
                    const style = document.createElement('style');
                    style.id = 'ripple-keyframes';
                    style.innerHTML = `
                        @keyframes ripple-anim {
                            to { transform: scale(4); opacity: 0; }
                        }
                    `;
                    document.head.appendChild(style);
                }

                // Make sure button has relative positioning/overflow hidden
                const currentPos = window.getComputedStyle(this).position;
                if (currentPos === 'static') this.style.position = 'relative';
                this.style.overflow = 'hidden';

                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            });
        });
    };

    // 3. Smooth Page Transitions
    const initPageTransitions = () => {
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.4s ease-out';
        
        requestAnimationFrame(() => {
            document.body.style.opacity = '1';
        });

        document.querySelectorAll('a[href]').forEach(link => {
            const href = link.getAttribute('href');
            // Check if internal link
            if (href && !href.startsWith('http') && !href.startsWith('#') && !link.hasAttribute('target')) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.body.style.opacity = '0';
                    setTimeout(() => {
                        window.location.href = href;
                    }, 400); // Wait for fade out
                });
            }
        });
    };

    // 4. Input Focus Enhancements
    const initInputs = () => {
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.classList.add('pulse-active');
            });
            input.addEventListener('animationend', () => {
                input.parentElement.classList.remove('pulse-active');
            });
        });
    };

    // 5. Toast Notification System
    window.uiToast = (message, type = 'info', duration = 4000) => {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Icons based on type
        const icons = {
            success: '✓',
            error: '✗',
            info: 'ℹ',
            warning: '⚠'
        };

        toast.innerHTML = `
            <span style="font-size: 1.2rem; display: inline-block;">${icons[type] || icons.info}</span>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Click to dismiss
        toast.addEventListener('click', () => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        });

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    toast.classList.add('fade-out');
                    setTimeout(() => toast.remove(), 300);
                }
            }, duration);
        }
    };

    // 6. Intersection Observer for Scroll Animations
    const initScrollAnimations = () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.card:not(.hero-card)').forEach(card => {
            // Remove existing animation classes if any, to trigger via observer
            card.classList.remove('fade-in'); 
            card.style.opacity = '0'; // hide initially
            observer.observe(card);
        });
    };

    // Run all initializations
    try { initTooltips(); } catch (e) { console.warn(e); }
    try { initRipples(); } catch (e) { console.warn(e); }
    try { initPageTransitions(); } catch (e) { console.warn(e); }
    try { initInputs(); } catch (e) { console.warn(e); }
    try { initScrollAnimations(); } catch (e) { console.warn(e); }

    // Override console.log temporarily just to show a welcome toast
    setTimeout(() => {
        if(window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
            window.uiToast('System Ready: All UI modules loaded securely.', 'success');
        } else if (window.location.pathname.includes('ai-automation.html')) {
            window.uiToast('AI Agent Initialized', 'info');
        }
    }, 800);
});
