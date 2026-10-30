import React from 'react';

export interface AhizanIconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    className?: string;
}

/**
 * Icône Panier Officielle Ahizan (basée sur 03.png)
 * Tracé officiel : poignée arrondie à gauche, fût incliné avec coupe franche,
 * corps en « Z » incurvé à terminaisons nettes et deux roues circulaires pleines.
 */
export const AhizanCartIcon: React.FC<AhizanIconProps> = ({
    size = 24,
    color = 'currentColor',
    className = '',
    ...props
}) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1000 1000"
        width={size}
        height={size}
        fill={color}
        className={className}
        aria-hidden="true"
        {...props}
    >
        {/* Poignée et montant gauche incliné */}
        <path d="M 91 206 L 202 206 Q 228 206 239 230 L 397 591 L 342 616 L 189 266 L 91 266 A 30 30 0 0 1 91 206 Z" />
        
        {/* Corps du chariot en Z incurvé */}
        <path d="M 332 294 C 465 362 698 362 831 293 L 851 338 L 422 661 C 535 712 685 704 789 623 L 826 673 C 685 780 465 780 314 676 L 680 391 C 565 408 425 392 313 339 L 332 294 Z" />
        
        {/* Roues du chariot */}
        <circle cx="448" cy="798" r="69" />
        <circle cx="721" cy="798" r="69" />
    </svg>
);

/**
 * Brand Device / Signature "Z" Bold Ahizan
 * Tracé monobloc ultra-bold aux courbes douces et extrémités généreusement arrondies.
 */
export const AhizanBrandDevice: React.FC<AhizanIconProps> = ({
    size = 24,
    color = '#DF1B33',
    className = '',
    ...props
}) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1000 1000"
        width={size}
        height={size}
        fill={color}
        className={className}
        aria-hidden="true"
        {...props}
    >
        <path d="M 242 222 C 395 298 585 305 746 267 C 802 254 845 308 825 362 C 820 375 810 385 796 396 L 478 631 C 565 654 655 642 736 598 C 788 575 838 618 829 676 C 824 700 806 716 782 726 C 645 782 465 776 332 706 C 295 684 294 622 334 590 L 551 417 C 425 415 295 385 188 326 C 146 300 150 232 198 214 C 214 208 229 214 242 222 Z" />
    </svg>
);
