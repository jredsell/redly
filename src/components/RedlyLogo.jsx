import React from 'react';
import logo from '../assets/Redly_logo.png';

const RedlyLogo = ({ size = 40, showText = true, isDarkMode = false, style = {} }) => {
    return (
        <img
            src={logo}
            alt="Redly"
            style={{
                height: `${size}px`,
                width: 'auto',
                maxWidth: showText ? '320px' : `${size * 4}px`,
                display: 'block',
                objectFit: 'contain',
                ...style,
            }}
        />
    );
};

export default RedlyLogo;
