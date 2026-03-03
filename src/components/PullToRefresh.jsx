import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

const PULL_THRESHOLD = 70; // Pixels distance to trigger a refresh
const MAX_PULL = 120; // Visual clamp

export default function PullToRefresh({ children }) {
    const [startY, setStartY] = useState(0);
    const [pullDistance, setPullDistance] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef(null);

    // Determines if the user is cleanly at the absolute top of the scroll envelope
    const isAtTop = () => {
        // If they click on something that isn't scrollable, assume we are at the top and can pull
        if (!containerRef.current) return true;

        // Find the closest scrollable parent up the DOM tree from the touch target
        // We only want to trigger PTR if the actual content they are dragging can't go up further.
        const scrollableNode = document.querySelector('.sidebar-content, .editor-pane, .global-tasks-scroll');

        // If there's an active generic scroll container we are aware of, check its bounds
        if (scrollableNode) {
            return scrollableNode.scrollTop <= 0;
        }

        return true;
    };

    const handleTouchStart = (e) => {
        if (!isAtTop() || isRefreshing) return;
        setStartY(e.touches[0].clientY);
        setPullDistance(0);
        setIsPulling(false);
    };

    const handleTouchMove = (e) => {
        if (startY === 0 || !isAtTop() || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;

        // If dragging downwards
        if (deltaY > 0) {
            // Cancel vertical scroll events on the parent body to avoid bouncing artifacts
            // but only if we've dragged far enough to distinguish from an accidental tap/jitter
            if (deltaY > 10) {
                e.preventDefault(); // Might trigger passive event warning on some strict browsers, but typically okay for this specific wrapper hook
                setIsPulling(true);
            }
            // Add visual friction to the pull string
            setPullDistance(Math.min(deltaY * 0.45, MAX_PULL));
        } else {
            // Dragging upwards, cancel wrapper
            setIsPulling(false);
            setPullDistance(0);
        }
    };

    const handleTouchEnd = () => {
        if (!isPulling) return;

        if (pullDistance >= (PULL_THRESHOLD * 0.45)) { // Adjusting threshold against the friction curve
            // Execute Refresh
            setIsRefreshing(true);
            setPullDistance(PULL_THRESHOLD * 0.45); // Lock it to a nice loading height

            // Allow the UI to paint the spinner, then actually destroy the session
            setTimeout(() => {
                window.location.reload();
            }, 400);

        } else {
            // Snap back naturally
            setIsPulling(false);
            setPullDistance(0);
            setStartY(0);
        }
    };

    // Global passive override for touchmove to allow preventDefault inside React synthetic events
    useEffect(() => {
        const target = containerRef.current;
        if (!target) return;

        const handleNativeTouchMove = (e) => {
            if (isPulling) {
                e.preventDefault();
            }
        };

        target.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
        return () => target.removeEventListener('touchmove', handleNativeTouchMove);
    }, [isPulling]);

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                height: '100%',
                width: '100%',
                position: 'relative',
                overflow: 'hidden' // We contain the pull boundary here
            }}
        >
            {/* The Hidden/Dragged Spinner Indicator */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '60px', // Standard height block
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `translateY(${pullDistance - 60}px)`, // Negative translation hides it above the screen
                    transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Snap back animation
                    zIndex: 9999,
                    pointerEvents: 'none',
                    opacity: pullDistance > 10 ? 1 : 0
                }}
            >
                <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '50%',
                    padding: '8px',
                    boxShadow: 'var(--shadow-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isRefreshing ? 'var(--accent-color)' : 'var(--text-secondary)'
                }}>
                    <RefreshCw
                        size={24}
                        style={{
                            transform: `rotate(${pullDistance * 4}deg)`, // Rotate proportionally as they drag down
                            transition: isRefreshing ? 'transform 1s linear infinite' : 'none' // Spin infinitely on release
                        }}
                        className={isRefreshing ? 'spin-anim' : ''}
                    />
                </div>
            </div>

            {/* The Main Application Content wrapper */}
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    transform: `translateY(${pullDistance}px)`, // Push the entire app down seamlessly
                    transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }}
            >
                {children}
            </div>

            {/* Inject CSS animation for infinite spin */}
            <style>{`
                @keyframes pwa-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin-anim {
                    animation: pwa-spin 1s linear infinite !important;
                }
            `}</style>
        </div>
    );
}
